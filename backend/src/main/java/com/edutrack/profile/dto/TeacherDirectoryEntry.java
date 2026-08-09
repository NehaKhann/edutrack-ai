package com.edutrack.profile.dto;

public record TeacherDirectoryEntry(
        Long teacherId,
        String name,
        String email,
        String designation,
        boolean hasPhoto,
        long subjectCount
) {
}
