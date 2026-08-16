package com.edutrack.face.dto;

import com.edutrack.face.entity.TeacherFaceEmbedding;

import java.time.Instant;

public record PendingFaceEnrollmentResponse(
        Long teacherId,
        String teacherName,
        Instant submittedAt
) {
    public static PendingFaceEnrollmentResponse from(TeacherFaceEmbedding e) {
        return new PendingFaceEnrollmentResponse(e.getTeacher().getId(), e.getTeacher().getName(), e.getUpdatedAt());
    }
}
