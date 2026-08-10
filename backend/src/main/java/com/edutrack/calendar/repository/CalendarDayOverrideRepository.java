package com.edutrack.calendar.repository;

import com.edutrack.calendar.entity.CalendarDayOverride;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CalendarDayOverrideRepository extends JpaRepository<CalendarDayOverride, Long> {
    Optional<CalendarDayOverride> findBySchoolIdAndDate(Long schoolId, LocalDate date);
    List<CalendarDayOverride> findBySchoolIdAndDateBetweenOrderByDateAsc(Long schoolId, LocalDate start, LocalDate end);
}
