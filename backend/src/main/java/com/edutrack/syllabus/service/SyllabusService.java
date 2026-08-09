package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.storage.FileStorageService;
import com.edutrack.syllabus.dto.FailedFileResponse;
import com.edutrack.syllabus.dto.SyllabusDocumentResponse;
import com.edutrack.syllabus.dto.SyllabusResponse;
import com.edutrack.syllabus.dto.SyllabusUploadResult;
import com.edutrack.syllabus.entity.Syllabus;
import com.edutrack.syllabus.entity.SyllabusDocument;
import com.edutrack.syllabus.repository.SyllabusDocumentRepository;
import com.edutrack.syllabus.repository.SyllabusRepository;
import com.edutrack.syllabus.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

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
    public SyllabusUploadResult createSyllabusWithDocuments(Long subjectId, String term, LocalDate termStartDate, List<MultipartFile> files) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        assertOwnsSubject(subject);
        requireAtLeastOneFile(files);

        Syllabus syllabus = syllabusRepository.save(new Syllabus(subject, term, termStartDate));
        return processFiles(syllabus, files);
    }

    @Transactional
    public SyllabusUploadResult addDocuments(Long syllabusId, List<MultipartFile> files) {
        Syllabus syllabus = getOwned(syllabusId);
        assertNotConfirmed(syllabus, "adding more files");
        requireAtLeastOneFile(files);
        return processFiles(syllabus, files);
    }

    private void requireAtLeastOneFile(List<MultipartFile> files) {
        if (files == null || files.isEmpty() || files.stream().allMatch(MultipartFile::isEmpty)) {
            throw ApiException.badRequest("Please choose at least one file to upload");
        }
    }

    private SyllabusUploadResult processFiles(Syllabus syllabus, List<MultipartFile> files) {
        int nextOrder = (int) syllabusDocumentRepository.countBySyllabusId(syllabus.getId());
        List<SyllabusDocument> created = new ArrayList<>();
        List<FailedFileResponse> failures = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            try {
                String extractedText = documentTextExtractor.extract(file);
                if (extractedText == null || extractedText.isBlank()) {
                    failures.add(new FailedFileResponse(file.getOriginalFilename(),
                            "No readable text found. Try a clearer scan/photo."));
                    continue;
                }
                String fileRef = fileStorageService.store(file, "syllabus");
                SyllabusDocument doc = new SyllabusDocument(syllabus, file.getOriginalFilename(), fileRef, extractedText, nextOrder++);
                created.add(syllabusDocumentRepository.save(doc));
            } catch (RuntimeException e) {
                log.warn("Failed to process syllabus file '{}': {}", file.getOriginalFilename(), e.getMessage());
                failures.add(new FailedFileResponse(file.getOriginalFilename(), e.getMessage()));
            }
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

    @Transactional
    public void deleteDocument(Long documentId) {
        SyllabusDocument doc = getOwnedDocument(documentId);
        assertNotConfirmed(doc.getSyllabus(), "removing files");
        syllabusDocumentRepository.delete(doc);
    }

    @Transactional
    public SyllabusResponse confirm(Long syllabusId) {
        Syllabus syllabus = getOwned(syllabusId);
        if (syllabusDocumentRepository.countBySyllabusId(syllabusId) == 0) {
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

    @Transactional(readOnly = true)
    public List<SyllabusResponse> listForSubject(Long subjectId) {
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
        if (user.getRole() == Role.TEACHER && !subject.getTeacher().getId().equals(user.getUserId())) {
            throw ApiException.forbidden("You can only manage syllabi for subjects you teach");
        }
    }
}
