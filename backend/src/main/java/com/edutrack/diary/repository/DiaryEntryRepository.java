package com.edutrack.diary.repository;

import com.edutrack.diary.entity.DiaryEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DiaryEntryRepository extends JpaRepository<DiaryEntry, Long> {
    Optional<DiaryEntry> findBySubjectIdAndEntryDate(Long subjectId, LocalDate entryDate);
    List<DiaryEntry> findByTeacherIdAndEntryDateOrderByIdDesc(Long teacherId, LocalDate entryDate);
    List<DiaryEntry> findBySubjectClassSectionIdAndEntryDate(Long classSectionId, LocalDate entryDate);
}
