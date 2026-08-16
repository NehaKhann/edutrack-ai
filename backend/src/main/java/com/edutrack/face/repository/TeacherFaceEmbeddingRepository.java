package com.edutrack.face.repository;

import com.edutrack.face.entity.FaceEnrollmentStatus;
import com.edutrack.face.entity.TeacherFaceEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TeacherFaceEmbeddingRepository extends JpaRepository<TeacherFaceEmbedding, Long> {
    Optional<TeacherFaceEmbedding> findByTeacherId(Long teacherId);
    List<TeacherFaceEmbedding> findByTeacher_School_IdAndStatusOrderByUpdatedAtAsc(Long schoolId, FaceEnrollmentStatus status);
}
