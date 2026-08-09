package com.edutrack.calendar.repository;

import com.edutrack.calendar.entity.SchoolHoliday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface SchoolHolidayRepository extends JpaRepository<SchoolHoliday, Long> {
    List<SchoolHoliday> findBySchoolIdOrderByStartDateAsc(Long schoolId);
    List<SchoolHoliday> findBySchoolIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long schoolId, LocalDate rangeEnd, LocalDate rangeStart);
}
