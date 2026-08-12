package com.edutrack.timetable.dto;

import com.edutrack.timetable.entity.TimetableEntry;

import java.time.DayOfWeek;

public record TimetableEntryResponse(
        Long id,
        DayOfWeek dayOfWeek,
        Integer period,
        Long subjectId,
        String subjectName,
        Long teacherId,
        String teacherName,
        Long classSectionId,
        String classSectionName
) {
    public static TimetableEntryResponse from(TimetableEntry e) {
        return new TimetableEntryResponse(
                e.getId(),
                e.getDayOfWeek(),
                e.getPeriod(),
                e.getSubject() != null ? e.getSubject().getId() : null,
                e.getSubject() != null ? e.getSubject().getName() : null,
                e.getTeacher() != null ? e.getTeacher().getId() : null,
                e.getTeacher() != null ? e.getTeacher().getName() : null,
                e.getClassSection().getId(),
                e.getClassSection().getName()
        );
    }
}
