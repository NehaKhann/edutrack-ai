package com.edutrack.calendar.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.calendar.dto.DayNoteRequest;
import com.edutrack.calendar.dto.DayStatusResponse;
import com.edutrack.calendar.dto.MonthViewResponse;
import com.edutrack.calendar.service.SchoolCalendarService;
import com.edutrack.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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

    @GetMapping("/day-status")
    public ApiResponse<List<DayStatusResponse>> dayStatus(@RequestParam int year, @RequestParam int month) {
        return ApiResponse.ok(schoolCalendarService.getDayStatusGrid(year, month));
    }

    @PostMapping("/notes")
    public ApiResponse<Void> saveNote(@Valid @RequestBody DayNoteRequest request) {
        schoolCalendarService.saveNote(request);
        return ApiResponse.ok(null);
    }
}
