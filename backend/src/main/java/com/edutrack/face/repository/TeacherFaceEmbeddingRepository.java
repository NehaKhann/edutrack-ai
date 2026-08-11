package com.edutrack.face.repository;

import com.edutrack.face.entity.TeacherFaceEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TeacherFaceEmbeddingRepository extends JpaRepository<TeacherFaceEmbedding, Long> {
    Optional<TeacherFaceEmbedding> findByTeacherId(Long teacherId);
}
