package com.edutrack.calendar.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.calendar.dto.BulkUpdateRequest;
import com.edutrack.calendar.dto.BulkUpdateResult;
import com.edutrack.calendar.dto.MonthViewResponse;
import com.edutrack.calendar.dto.SetDayRequest;
import com.edutrack.calendar.dto.WeekendDaysRequest;
import com.edutrack.calendar.service.SchoolCalendarService;
import com.edutrack.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

@RestController
@RequestMapping("/api/principal/calendar")
@RequiredArgsConstructor
public class PrincipalCalendarController {

    private final SchoolCalendarService schoolCalendarService;

    @PostMapping("/day")
    public ApiResponse<MonthViewResponse> setDay(@Valid @RequestBody SetDayRequest request) {
        return ApiResponse.ok(schoolCalendarService.setDay(request));
    }

    @DeleteMapping("/day/{date}")
    public ApiResponse<MonthViewResponse> resetDay(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(schoolCalendarService.resetDay(date));
    }

    @PostMapping("/bulk")
    public ApiResponse<BulkUpdateResult> bulkUpdate(@Valid @RequestBody BulkUpdateRequest request) {
        return ApiResponse.ok(schoolCalendarService.bulkUpdate(request));
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
