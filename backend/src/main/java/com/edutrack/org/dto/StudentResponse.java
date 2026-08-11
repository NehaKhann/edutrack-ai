package com.edutrack.org.dto;

import com.edutrack.org.entity.Student;

public record StudentResponse(
        Long id,
        String name,
        String rollNumber,
        Long classSectionId
) {
    public static StudentResponse from(Student s) {
        return new StudentResponse(s.getId(), s.getName(), s.getRollNumber(), s.getClassSection().getId());
    }
}
