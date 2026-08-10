package com.edutrack.syllabus.repository;

import com.edutrack.syllabus.entity.Topic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TopicRepository extends JpaRepository<Topic, Long> {
    List<Topic> findBySyllabusIdOrderByOrderIndexAsc(Long syllabusId);
    List<Topic> findBySyllabusSubjectIdOrderByOrderIndexAsc(Long subjectId);
    List<Topic> findBySyllabusSubjectClassSectionSchoolId(Long schoolId);
    List<Topic> findBySyllabusSubjectTeacherId(Long teacherId);
    long countBySyllabusSubjectIdAndCoveredTrue(Long subjectId);
}
