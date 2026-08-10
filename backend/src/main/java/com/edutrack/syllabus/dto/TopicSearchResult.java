package com.edutrack.syllabus.dto;

import com.edutrack.syllabus.entity.Topic;

import java.time.LocalDate;

public record TopicSearchResult(
        Long topicId,
        String title,
        LocalDate plannedStartDate,
        LocalDate plannedEndDate,
        boolean covered,
        Long subjectId,
        String subjectName,
        String classSectionName,
        Long syllabusId,
        String syllabusTerm
) {
    public static TopicSearchResult from(Topic t) {
        var subject = t.getSyllabus().getSubject();
        return new TopicSearchResult(
                t.getId(), t.getTitle(), t.getPlannedStartDate(), t.getPlannedEndDate(), t.isCovered(),
                subject.getId(), subject.getName(), subject.getClassSection().getName(),
                t.getSyllabus().getId(), t.getSyllabus().getTerm()
        );
    }
}
