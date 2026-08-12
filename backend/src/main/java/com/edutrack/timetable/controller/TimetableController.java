package com.edutrack.timetable.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.timetable.dto.TeacherTimetableResponse;
import com.edutrack.timetable.service.TimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;

    @GetMapping("/api/timetable/me")
    public ApiResponse<TeacherTimetableResponse> myTimetable() {
        return ApiResponse.ok(timetableService.getMyTimetable());
    }
}
