package com.edutrack.org.repository;

import com.edutrack.org.entity.ClassSection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClassSectionRepository extends JpaRepository<ClassSection, Long> {
    List<ClassSection> findBySchoolId(Long schoolId);

    boolean existsBySchoolIdAndClassNameIgnoreCase(Long schoolId, String className);

    boolean existsBySchoolIdAndClassNameIgnoreCaseAndSectionNameIgnoreCase(Long schoolId, String className, String sectionName);

    boolean existsBySchoolIdAndClassNameIgnoreCaseAndSectionNameIsNull(Long schoolId, String className);
}
