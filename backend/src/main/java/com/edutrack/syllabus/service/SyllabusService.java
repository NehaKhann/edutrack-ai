package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.storage.FileStorageService;
import com.edutrack.syllabus.dto.DocumentPreviewInfo;
import com.edutrack.syllabus.dto.FailedFileResponse;
import com.edutrack.syllabus.dto.PreviewImage;
import com.edutrack.syllabus.dto.SyllabusDocumentResponse;
import com.edutrack.syllabus.dto.SyllabusResponse;
import com.edutrack.syllabus.dto.SyllabusUploadResult;
import com.edutrack.syllabus.entity.Syllabus;
import com.edutrack.syllabus.entity.SyllabusDocument;
import com.edutrack.syllabus.entity.Topic;
import com.edutrack.syllabus.repository.SyllabusDocumentRepository;
import com.edutrack.syllabus.repository.SyllabusRepository;
import com.edutrack.syllabus.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SyllabusService {

    private static final Logger log = LoggerFactory.getLogger(SyllabusService.class);

    private final SyllabusRepository syllabusRepository;
    private final SubjectRepository subjectRepository;
    private final TopicRepository topicRepository;
    private final SyllabusDocumentRepository syllabusDocumentRepository;
    private final FileStorageService fileStorageService;
    private final DocumentTextExtractor documentTextExtractor;

    @Transactional
    public SyllabusUploadResult createSyllabusWithDocuments(
            Long subjectId, String term, LocalDate termStartDate, List<MultipartFile> files, String manualText,
            Long cloneFromSyllabusId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        assertOwnsSubject(subject);

        Syllabus sourceSyllabus = null;
        if (cloneFromSyllabusId != null) {
            sourceSyllabus = syllabusRepository.findById(cloneFromSyllabusId)
                    .orElseThrow(() -> ApiException.notFound("Syllabus to clone from not found"));
            if (!sourceSyllabus.getSubject().getId().equals(subjectId)) {
                throw ApiException.badRequest("Can only clone topics from a syllabus of the same subject");
            }
        }
        requireAtLeastOneFileOrText(files, manualText, sourceSyllabus != null);

        Syllabus syllabus = syllabusRepository.save(new Syllabus(subject, term, termStartDate));
        if (sourceSyllabus != null) {
            cloneTopics(sourceSyllabus, syllabus);
        }
        return processFiles(syllabus, files, manualText);
    }

    @Transactional
    public SyllabusUploadResult addDocuments(Long syllabusId, List<MultipartFile> files, String manualText) {
        Syllabus syllabus = getOwned(syllabusId);
        assertNotConfirmed(syllabus, "adding more files");
        requireAtLeastOneFileOrText(files, manualText, false);
        return processFiles(syllabus, files, manualText);
    }

    private void requireAtLeastOneFileOrText(List<MultipartFile> files, String manualText, boolean hasAlternative) {
        boolean hasFiles = files != null && files.stream().anyMatch(f -> !f.isEmpty());
        boolean hasText = manualText != null && !manualText.isBlank();
        if (!hasFiles && !hasText && !hasAlternative) {
            throw ApiException.badRequest("Please choose at least one file, type the syllabus text manually, or clone from a previous term");
        }
    }

    private void cloneTopics(Syllabus source, Syllabus target) {
        long deltaDays = target.getTermStartDate().toEpochDay() - source.getTermStartDate().toEpochDay();
        List<Topic> sourceTopics = topicRepository.findBySyllabusIdOrderByOrderIndexAsc(source.getId());
        List<Topic> cloned = sourceTopics.stream().map(t -> new Topic(
                target, t.getTitle(), t.getStartWeek(), t.getEndWeek(),
                t.getPlannedStartDate().plusDays(deltaDays), t.getPlannedEndDate().plusDays(deltaDays),
                t.getOrderIndex()
        )).toList();
        topicRepository.saveAll(cloned);
    }

    private SyllabusUploadResult processFiles(Syllabus syllabus, List<MultipartFile> files, String manualText) {
        int nextOrder = (int) syllabusDocumentRepository.countBySyllabusId(syllabus.getId());
        List<SyllabusDocument> created = new ArrayList<>();
        List<FailedFileResponse> failures = new ArrayList<>();

        if (files != null) {
            for (MultipartFile file : files) {
                if (file.isEmpty()) continue;
                try {
                    DocumentTextExtractor.ExtractionResult extraction = documentTextExtractor.extract(file);
                    if (extraction.text() == null || extraction.text().isBlank()) {
                        failures.add(new FailedFileResponse(file.getOriginalFilename(),
                                "No readable text found. Try a clearer scan/photo."));
                        continue;
                    }
                    String fileRef = fileStorageService.store(file, "syllabus");
                    String lowConfWords = extraction.lowConfidenceWords().isEmpty()
                            ? null : String.join(",", extraction.lowConfidenceWords());
                    SyllabusDocument doc = new SyllabusDocument(syllabus, file.getOriginalFilename(), fileRef, extraction.text(), nextOrder++,
                            extraction.contentType(), extraction.ocrConfidence(), extraction.ocrLanguage(), lowConfWords);
                    created.add(syllabusDocumentRepository.save(doc));
                } catch (RuntimeException e) {
                    log.warn("Failed to process syllabus file '{}': {}", file.getOriginalFilename(), e.getMessage());
                    failures.add(new FailedFileResponse(file.getOriginalFilename(), e.getMessage()));
                }
            }
        }

        if (manualText != null && !manualText.isBlank()) {
            SyllabusDocument doc = new SyllabusDocument(syllabus, "Manual entry", null, manualText.trim(), nextOrder++);
            created.add(syllabusDocumentRepository.save(doc));
        }

        return new SyllabusUploadResult(
                SyllabusResponse.from(syllabus, hasTopics(syllabus.getId())),
                created.stream().map(SyllabusDocumentResponse::from).toList(),
                failures
        );
    }

    @Transactional(readOnly = true)
    public List<SyllabusDocumentResponse> listDocuments(Long syllabusId) {
        getOwned(syllabusId);
        return syllabusDocumentRepository.findBySyllabusIdOrderByOrderIndexAsc(syllabusId)
                .stream().map(SyllabusDocumentResponse::from).toList();
    }

    @Transactional
    public SyllabusDocumentResponse updateDocumentText(Long documentId, String text) {
        SyllabusDocument doc = getOwnedDocument(documentId);
        assertNotConfirmed(doc.getSyllabus(), "editing its content");
        doc.setExtractedText(text);
        return SyllabusDocumentResponse.from(syllabusDocumentRepository.save(doc));
    }

    @Transactional(readOnly = true)
    public DocumentPreviewInfo getPreviewInfo(Long documentId) {
        SyllabusDocument doc = getOwnedDocument(documentId);
        String contentType = resolveContentType(doc);
        if (doc.getFileRef() == null || contentType == null) {
            return new DocumentPreviewInfo("NONE", 0);
        }
        if (contentType.startsWith("image/")) {
            return new DocumentPreviewInfo("IMAGE", 1);
        }
        if (contentType.equals("application/pdf")) {
            byte[] bytes = fileStorageService.load(doc.getFileRef());
            try (PDDocument pdf = PDDocument.load(new ByteArrayInputStream(bytes))) {
                return new DocumentPreviewInfo("PDF", pdf.getNumberOfPages());
            } catch (IOException e) {
                return new DocumentPreviewInfo("NONE", 0);
            }
        }
        return new DocumentPreviewInfo("NONE", 0);
    }

    @Transactional(readOnly = true)
    public PreviewImage getPreviewImage(Long documentId, int page) {
        SyllabusDocument doc = getOwnedDocument(documentId);
        String contentType = resolveContentType(doc);
        if (doc.getFileRef() == null || contentType == null) {
            throw ApiException.notFound("Preview not available for this document");
        }
        byte[] bytes = fileStorageService.load(doc.getFileRef());

        if (contentType.startsWith("image/")) {
            return new PreviewImage(bytes, contentType);
        }

        if (contentType.equals("application/pdf")) {
            try (PDDocument pdf = PDDocument.load(new ByteArrayInputStream(bytes))) {
                int index = page - 1;
                if (index < 0 || index >= pdf.getNumberOfPages()) {
                    throw ApiException.notFound("Page not found");
                }
                PDFRenderer renderer = new PDFRenderer(pdf);
                BufferedImage image = renderer.renderImageWithDPI(index, 150f, ImageType.RGB);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                ImageIO.write(image, "png", out);
                return new PreviewImage(out.toByteArray(), "image/png");
            } catch (IOException e) {
                throw ApiException.internal("Could not render PDF page: " + e.getMessage());
            }
        }

        throw ApiException.notFound("Preview not available for this document");
    }

    /**
     * Documents uploaded before content-type tracking was added have a null contentType even though their
     * file is still on disk — infer it from the stored file's extension rather than permanently losing preview
     * support for anything uploaded before that point.
     */
    private String resolveContentType(SyllabusDocument doc) {
        if (doc.getContentType() != null) return doc.getContentType();
        if (doc.getFileRef() == null) return null;
        String ref = doc.getFileRef().toLowerCase();
        if (ref.endsWith(".pdf")) return "application/pdf";
        if (ref.endsWith(".jpg") || ref.endsWith(".jpeg")) return "image/jpeg";
        if (ref.endsWith(".png")) return "image/png";
        if (ref.endsWith(".webp")) return "image/webp";
        return null;
    }

    @Transactional
    public void deleteDocument(Long documentId) {
        SyllabusDocument doc = getOwnedDocument(documentId);
        assertNotConfirmed(doc.getSyllabus(), "removing files");
        syllabusDocumentRepository.delete(doc);
        if (doc.getFileRef() != null) {
            fileStorageService.delete(doc.getFileRef());
        }
    }

    @Transactional
    public SyllabusResponse confirm(Long syllabusId) {
        Syllabus syllabus = getOwned(syllabusId);
        boolean hasDocuments = syllabusDocumentRepository.countBySyllabusId(syllabusId) > 0;
        if (!hasDocuments && !hasTopics(syllabusId)) {
            throw ApiException.badRequest("Upload at least one document before confirming.");
        }
        syllabus.setConfirmed(true);
        syllabus.setConfirmedAt(Instant.now());
        syllabusRepository.save(syllabus);
        return SyllabusResponse.from(syllabus, hasTopics(syllabusId));
    }

    @Transactional
    public SyllabusResponse unconfirm(Long syllabusId) {
        Syllabus syllabus = getOwned(syllabusId);
        syllabus.setConfirmed(false);
        syllabus.setConfirmedAt(null);
        syllabusRepository.save(syllabus);
        return SyllabusResponse.from(syllabus, hasTopics(syllabusId));
    }

    @Transactional
    public SyllabusResponse setPlanningFinalized(Long syllabusId, boolean finalized) {
        Syllabus syllabus = getOwned(syllabusId);
        if (finalized) {
            if (!hasTopics(syllabusId)) {
                throw ApiException.badRequest("Add at least one topic to the plan before finalizing it.");
            }
            syllabus.setPlanningFinalizedAt(Instant.now());
        } else {
            syllabus.setPlanningFinalizedAt(null);
        }
        syllabusRepository.save(syllabus);
        return SyllabusResponse.from(syllabus, hasTopics(syllabusId));
    }

    @Transactional
    public SyllabusResponse updateMeta(Long syllabusId, String term, LocalDate termStartDate) {
        Syllabus syllabus = getOwned(syllabusId);
        syllabus.setTerm(term);
        syllabus.setTermStartDate(termStartDate);
        syllabusRepository.save(syllabus);
        return SyllabusResponse.from(syllabus, hasTopics(syllabusId));
    }

    @Transactional(readOnly = true)
    public List<SyllabusResponse> listForSubject(Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        assertOwnsSubject(subject);
        return syllabusRepository.findBySubjectId(subjectId).stream()
                .map(s -> SyllabusResponse.from(s, hasTopics(s.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public Syllabus getOwned(Long syllabusId) {
        Syllabus syllabus = syllabusRepository.findById(syllabusId)
                .orElseThrow(() -> ApiException.notFound("Syllabus not found"));
        assertOwnsSubject(syllabus.getSubject());
        return syllabus;
    }

    private SyllabusDocument getOwnedDocument(Long documentId) {
        SyllabusDocument doc = syllabusDocumentRepository.findById(documentId)
                .orElseThrow(() -> ApiException.notFound("Document not found"));
        assertOwnsSubject(doc.getSyllabus().getSubject());
        return doc;
    }

    private void assertNotConfirmed(Syllabus syllabus, String action) {
        if (syllabus.isConfirmed()) {
            throw ApiException.conflict("This syllabus is confirmed. Click \"Edit again\" before " + action + ".");
        }
    }

    private boolean hasTopics(Long syllabusId) {
        return !topicRepository.findBySyllabusIdOrderByOrderIndexAsc(syllabusId).isEmpty();
    }

    public void assertOwnsSubject(Subject subject) {
        AuthenticatedUser user = CurrentUser.get();
        if (!subject.getClassSection().getSchool().getId().equals(user.getSchoolId())) {
            throw ApiException.notFound("Subject not found");
        }
        if (user.getRole() == Role.TEACHER && !subject.getTeacher().getId().equals(user.getUserId())) {
            throw ApiException.forbidden("You can only manage syllabi for subjects you teach");
        }
    }
}
