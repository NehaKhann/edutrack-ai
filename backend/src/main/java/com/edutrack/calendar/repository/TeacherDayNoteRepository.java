package com.edutrack.calendar.repository;

import com.edutrack.calendar.entity.TeacherDayNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TeacherDayNoteRepository extends JpaRepository<TeacherDayNote, Long> {
    Optional<TeacherDayNote> findByTeacherIdAndDate(Long teacherId, LocalDate date);
    List<TeacherDayNote> findByTeacherIdAndDateBetween(Long teacherId, LocalDate start, LocalDate end);
}
