package com.edutrack.syllabus.dto;

import com.edutrack.syllabus.entity.Syllabus;

import java.time.Instant;
import java.time.LocalDate;

public record SyllabusResponse(
        Long id,
        String term,
        LocalDate termStartDate,
        Long subjectId,
        String subjectName,
        boolean confirmed,
        Instant confirmedAt,
        boolean hasExtractedTopics,
        boolean planningFinalized,
        Instant planningFinalizedAt
) {
    public static SyllabusResponse from(Syllabus s, boolean hasExtractedTopics) {
        return new SyllabusResponse(
                s.getId(), s.getTerm(), s.getTermStartDate(),
                s.getSubject().getId(), s.getSubject().getName(),
                s.isConfirmed(), s.getConfirmedAt(), hasExtractedTopics,
                s.isPlanningFinalized(), s.getPlanningFinalizedAt()
        );
    }
}
