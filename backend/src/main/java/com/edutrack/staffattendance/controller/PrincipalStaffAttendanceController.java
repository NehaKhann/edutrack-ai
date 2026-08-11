package com.edutrack.staffattendance.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.staffattendance.dto.TeacherAttendanceDetailResponse;
import com.edutrack.staffattendance.dto.TeacherAttendanceTodayRow;
import com.edutrack.staffattendance.service.StaffAttendanceOverviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class PrincipalStaffAttendanceController {

    private final StaffAttendanceOverviewService overviewService;

    @GetMapping("/api/principal/teacher-attendance/today")
    public ApiResponse<List<TeacherAttendanceTodayRow>> today() {
        return ApiResponse.ok(overviewService.today());
    }

    @GetMapping("/api/principal/teacher-attendance/{teacherId}/detail")
    public ApiResponse<TeacherAttendanceDetailResponse> detail(@PathVariable Long teacherId) {
        return ApiResponse.ok(overviewService.detail(teacherId));
    }
}
