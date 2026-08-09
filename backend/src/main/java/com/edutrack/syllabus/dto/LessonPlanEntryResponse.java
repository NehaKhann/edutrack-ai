package com.edutrack.syllabus.dto;

import com.edutrack.syllabus.entity.LessonPlanEntry;

import java.time.LocalDate;

public record LessonPlanEntryResponse(
        Long id,
        Long topicId,
        String topicTitle,
        Long subjectId,
        String subjectName,
        LocalDate plannedDate,
        String status,
        String reason,
        LocalDate actualDate
) {
    public static LessonPlanEntryResponse from(LessonPlanEntry e) {
        var subject = e.getTopic().getSyllabus().getSubject();
        return new LessonPlanEntryResponse(
                e.getId(),
                e.getTopic().getId(),
                e.getTopic().getTitle(),
                subject.getId(),
                subject.getName(),
                e.getPlannedDate(),
                e.getStatus().name(),
                e.getReason(),
                e.getActualDate()
        );
    }
}
