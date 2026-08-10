package com.edutrack.syllabus.dto;

public record CoverageGridRow(
        Long classSectionId,
        String classSectionName,
        Long subjectId,
        String subjectName,
        Long teacherId,
        String teacherName,
        long plannedToDateCount,
        long coveredCount,
        String status,
        Integer daysBehind
) {
}
