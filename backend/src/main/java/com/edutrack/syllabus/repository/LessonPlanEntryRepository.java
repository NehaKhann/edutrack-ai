package com.edutrack.syllabus.repository;

import com.edutrack.syllabus.entity.LessonPlanEntry;
import com.edutrack.syllabus.entity.LessonPlanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LessonPlanEntryRepository extends JpaRepository<LessonPlanEntry, Long> {
    List<LessonPlanEntry> findByTeacherIdAndPlannedDateOrderByIdAsc(Long teacherId, LocalDate plannedDate);
    List<LessonPlanEntry> findByTopicIdOrderByPlannedDateAsc(Long topicId);
    Optional<LessonPlanEntry> findByTopicIdAndPlannedDate(Long topicId, LocalDate plannedDate);
    List<LessonPlanEntry> findByTopicSyllabusSubjectIdAndStatusInOrderByPlannedDateDesc(Long subjectId, List<LessonPlanStatus> statuses);
}
