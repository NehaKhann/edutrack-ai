package com.edutrack.org.repository;

import com.edutrack.org.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByTeacherId(Long teacherId);
    List<Subject> findByClassSectionSchoolId(Long schoolId);
    List<Subject> findByClassSectionId(Long classSectionId);
    boolean existsByClassSectionIdAndTeacherId(Long classSectionId, Long teacherId);
    boolean existsByClassSectionIdAndNameIgnoreCase(Long classSectionId, String name);
}
