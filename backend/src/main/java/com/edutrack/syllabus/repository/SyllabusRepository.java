package com.edutrack.syllabus.repository;

import com.edutrack.syllabus.entity.Syllabus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SyllabusRepository extends JpaRepository<Syllabus, Long> {
    List<Syllabus> findBySubjectId(Long subjectId);
    List<Syllabus> findBySubjectClassSectionSchoolId(Long schoolId);
    Optional<Syllabus> findFirstBySubjectIdOrderByCreatedAtDesc(Long subjectId);
}
