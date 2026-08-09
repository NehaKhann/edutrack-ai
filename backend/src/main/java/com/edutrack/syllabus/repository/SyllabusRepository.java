package com.edutrack.syllabus.repository;

import com.edutrack.syllabus.entity.Syllabus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SyllabusRepository extends JpaRepository<Syllabus, Long> {
    List<Syllabus> findBySubjectId(Long subjectId);
    List<Syllabus> findBySubjectClassSectionSchoolId(Long schoolId);
}
