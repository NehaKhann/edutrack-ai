package com.edutrack.org.dto;

import com.edutrack.org.entity.Subject;

public record SubjectResponse(Long id, String name, Long classSectionId, String classSectionName, Long teacherId, String teacherName) {
    public static SubjectResponse from(Subject s) {
        return new SubjectResponse(
                s.getId(),
                s.getName(),
                s.getClassSection().getId(),
                s.getClassSection().getName(),
                s.getTeacher().getId(),
                s.getTeacher().getName()
        );
    }
}
