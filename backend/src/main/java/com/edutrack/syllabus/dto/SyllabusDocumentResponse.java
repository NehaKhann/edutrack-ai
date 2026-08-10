package com.edutrack.syllabus.dto;

import com.edutrack.syllabus.entity.SyllabusDocument;

import java.util.List;

public record SyllabusDocumentResponse(
        Long id,
        Long syllabusId,
        String originalFilename,
        String extractedText,
        int orderIndex,
        String contentType,
        Double ocrConfidence,
        String ocrLanguage,
        List<String> lowConfidenceWords
) {
    public static SyllabusDocumentResponse from(SyllabusDocument d) {
        List<String> lowConfidenceWords = d.getLowConfidenceWords() == null || d.getLowConfidenceWords().isBlank()
                ? List.of()
                : List.of(d.getLowConfidenceWords().split(","));
        return new SyllabusDocumentResponse(
                d.getId(), d.getSyllabus().getId(), d.getOriginalFilename(), d.getExtractedText(), d.getOrderIndex(),
                d.getContentType(), d.getOcrConfidence(), d.getOcrLanguage(), lowConfidenceWords
        );
    }
}
