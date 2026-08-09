package com.edutrack.syllabus.dto;

import com.edutrack.syllabus.entity.Syllabus;

import java.time.LocalDate;

public record SyllabusResponse(
        Long id,
        String term,
        LocalDate termStartDate,
        Long subjectId,
        String subjectName,
        String uploadedFileRef,
        boolean hasExtractedTopics
) {
    public static SyllabusResponse from(Syllabus s, boolean hasExtractedTopics) {
        return new SyllabusResponse(
                s.getId(), s.getTerm(), s.getTermStartDate(),
                s.getSubject().getId(), s.getSubject().getName(),
                s.getUploadedFileRef(), hasExtractedTopics
        );
    }
}
