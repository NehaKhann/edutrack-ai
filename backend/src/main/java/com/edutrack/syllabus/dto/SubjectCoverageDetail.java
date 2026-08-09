package com.edutrack.syllabus.dto;

import java.util.List;

public record SubjectCoverageDetail(
        Long subjectId,
        String subjectName,
        List<TopicResponse> topics,
        List<LessonPlanEntryResponse> missedOrRescheduledEntries
) {
}
