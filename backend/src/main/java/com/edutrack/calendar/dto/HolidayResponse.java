package com.edutrack.calendar.dto;

import com.edutrack.calendar.entity.SchoolHoliday;

import java.time.LocalDate;

public record HolidayResponse(Long id, String name, LocalDate startDate, LocalDate endDate) {
    public static HolidayResponse from(SchoolHoliday h) {
        return new HolidayResponse(h.getId(), h.getName(), h.getStartDate(), h.getEndDate());
    }
}
