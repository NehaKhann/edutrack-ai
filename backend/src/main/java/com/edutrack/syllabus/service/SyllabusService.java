package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.storage.FileStorageService;
import com.edutrack.syllabus.dto.SyllabusResponse;
import com.edutrack.syllabus.entity.Syllabus;
import com.edutrack.syllabus.repository.SyllabusRepository;
import com.edutrack.syllabus.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SyllabusService {

    private final SyllabusRepository syllabusRepository;
    private final SubjectRepository subjectRepository;
    private final TopicRepository topicRepository;
    private final FileStorageService fileStorageService;
    private final DocumentTextExtractor documentTextExtractor;

    @Transactional
    public SyllabusResponse upload(Long subjectId, String term, LocalDate termStartDate, MultipartFile file) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        assertOwnsSubject(subject);

        if (file.isEmpty()) {
            throw ApiException.badRequest("Please choose a syllabus file to upload");
        }

        String extractedText = documentTextExtractor.extract(file);
        if (extractedText == null || extractedText.isBlank()) {
            throw ApiException.badRequest("No readable text found in this file. Try a clearer scan/photo, or add topics manually.");
        }

        String fileRef = fileStorageService.store(file, "syllabus");

        Syllabus syllabus = new Syllabus(subject, term, termStartDate, fileRef);
        syllabus.setRawExtractedText(extractedText);
        syllabus = syllabusRepository.save(syllabus);

        return SyllabusResponse.from(syllabus, false);
    }

    @Transactional(readOnly = true)
    public List<SyllabusResponse> listForSubject(Long subjectId) {
        return syllabusRepository.findBySubjectId(subjectId).stream()
                .map(s -> SyllabusResponse.from(s, !topicRepository.findBySyllabusIdOrderByOrderIndexAsc(s.getId()).isEmpty()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Syllabus getOwned(Long syllabusId) {
        Syllabus syllabus = syllabusRepository.findById(syllabusId)
                .orElseThrow(() -> ApiException.notFound("Syllabus not found"));
        assertOwnsSubject(syllabus.getSubject());
        return syllabus;
    }

    public void assertOwnsSubject(Subject subject) {
        AuthenticatedUser user = CurrentUser.get();
        if (user.getRole() == Role.TEACHER && !subject.getTeacher().getId().equals(user.getUserId())) {
            throw ApiException.forbidden("You can only manage syllabi for subjects you teach");
        }
    }
}
