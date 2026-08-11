package com.edutrack.attendance.controller;

import com.edutrack.attendance.dto.BulkAttendanceRequest;
import com.edutrack.attendance.dto.ClassAttendanceSummary;
import com.edutrack.attendance.dto.StudentAttendanceRow;
import com.edutrack.attendance.service.StudentAttendanceService;
import com.edutrack.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class StudentAttendanceController {

    private final StudentAttendanceService attendanceService;

    @GetMapping("/api/attendance")
    public ApiResponse<List<StudentAttendanceRow>> getContext(
            @RequestParam Long classSectionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long subjectId,
            @RequestParam(required = false) Integer period) {
        return ApiResponse.ok(attendanceService.getContext(classSectionId, date, subjectId, period));
    }

    @PostMapping("/api/attendance/bulk")
    public ApiResponse<Void> bulkMark(@Valid @RequestBody BulkAttendanceRequest request) {
        attendanceService.bulkMark(request);
        return ApiResponse.ok(null);
    }

    @GetMapping("/api/principal/attendance/summary")
    public ApiResponse<List<ClassAttendanceSummary>> summary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(attendanceService.principalSummary(date));
    }

    @GetMapping("/api/principal/attendance/detail")
    public ApiResponse<List<StudentAttendanceRow>> detail(
            @RequestParam Long classSectionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(attendanceService.principalDetail(classSectionId, date));
    }
}
