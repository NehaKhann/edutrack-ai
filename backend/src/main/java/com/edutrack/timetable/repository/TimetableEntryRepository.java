package com.edutrack.timetable.repository;

import com.edutrack.timetable.entity.TimetableEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

public interface TimetableEntryRepository extends JpaRepository<TimetableEntry, Long> {
    List<TimetableEntry> findByClassSectionIdOrderByDayOfWeekAscPeriodAsc(Long classSectionId);

    List<TimetableEntry> findByTeacherIdOrderByDayOfWeekAscPeriodAsc(Long teacherId);

    Optional<TimetableEntry> findByClassSectionIdAndDayOfWeekAndPeriod(Long classSectionId, DayOfWeek dayOfWeek, Integer period);

    List<TimetableEntry> findByTeacherIdAndDayOfWeekAndPeriod(Long teacherId, DayOfWeek dayOfWeek, Integer period);
}
