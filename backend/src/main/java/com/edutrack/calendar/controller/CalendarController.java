package com.edutrack.calendar.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.calendar.dto.MonthViewResponse;
import com.edutrack.calendar.service.SchoolCalendarService;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final SchoolCalendarService schoolCalendarService;

    @GetMapping
    public ApiResponse<MonthViewResponse> monthView(@RequestParam int year, @RequestParam int month) {
        Long schoolId = CurrentUser.get().getSchoolId();
        return ApiResponse.ok(schoolCalendarService.getMonthView(schoolId, year, month));
    }
}
