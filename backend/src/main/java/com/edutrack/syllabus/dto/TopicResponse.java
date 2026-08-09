package com.edutrack.syllabus.dto;

import com.edutrack.syllabus.entity.Topic;

import java.time.LocalDate;

public record TopicResponse(
        Long id,
        Long syllabusId,
        String title,
        Integer startWeek,
        Integer endWeek,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        Integer orderIndex,
        boolean covered,
        LocalDate coveredDate
) {
    public static TopicResponse from(Topic t) {
        return new TopicResponse(
                t.getId(), t.getSyllabus().getId(), t.getTitle(), t.getStartWeek(), t.getEndWeek(),
                t.getPlannedStartDate(), t.getPlannedEndDate(), t.getOrderIndex(), t.isCovered(), t.getCoveredDate()
        );
    }
}
