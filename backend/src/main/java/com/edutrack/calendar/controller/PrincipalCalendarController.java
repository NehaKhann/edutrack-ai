package com.edutrack.calendar.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.calendar.dto.AddHolidayRequest;
import com.edutrack.calendar.dto.HolidayResponse;
import com.edutrack.calendar.dto.WeekendDaysRequest;
import com.edutrack.calendar.service.SchoolCalendarService;
import com.edutrack.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/principal/calendar")
@RequiredArgsConstructor
public class PrincipalCalendarController {

    private final SchoolCalendarService schoolCalendarService;

    @GetMapping("/holidays")
    public ApiResponse<List<HolidayResponse>> listHolidays() {
        return ApiResponse.ok(schoolCalendarService.listHolidays(CurrentUser.get().getSchoolId()));
    }

    @PostMapping("/holidays")
    public ApiResponse<HolidayResponse> addHoliday(@Valid @RequestBody AddHolidayRequest request) {
        return ApiResponse.ok(schoolCalendarService.addHoliday(request));
    }

    @DeleteMapping("/holidays/{holidayId}")
    public ApiResponse<Void> deleteHoliday(@PathVariable Long holidayId) {
        schoolCalendarService.deleteHoliday(holidayId);
        return ApiResponse.ok(null);
    }

    @GetMapping("/weekend-days")
    public ApiResponse<Set<DayOfWeek>> getWeekendDays() {
        return ApiResponse.ok(schoolCalendarService.getWeekendDays(CurrentUser.get().getSchoolId()));
    }

    @PutMapping("/weekend-days")
    public ApiResponse<Set<DayOfWeek>> setWeekendDays(@Valid @RequestBody WeekendDaysRequest request) {
        return ApiResponse.ok(schoolCalendarService.setWeekendDays(request.weekendDays()));
    }
}
