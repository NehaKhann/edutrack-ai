package com.edutrack.syllabus.dto;

import com.edutrack.syllabus.entity.SyllabusDocument;

public record SyllabusDocumentResponse(
        Long id,
        Long syllabusId,
        String originalFilename,
        String extractedText,
        int orderIndex
) {
    public static SyllabusDocumentResponse from(SyllabusDocument d) {
        return new SyllabusDocumentResponse(
                d.getId(), d.getSyllabus().getId(), d.getOriginalFilename(), d.getExtractedText(), d.getOrderIndex()
        );
    }
}
