package com.edutrack.staffattendance.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.staffattendance.dto.CreateSkipReportRequest;
import com.edutrack.staffattendance.dto.LeaveBalanceResponse;
import com.edutrack.staffattendance.dto.LeaveRequestResponse;
import com.edutrack.staffattendance.dto.MyTodayStatusResponse;
import com.edutrack.staffattendance.dto.SetMyStatusRequest;
import com.edutrack.staffattendance.dto.SkippedClassReportResponse;
import com.edutrack.staffattendance.entity.LeaveType;
import com.edutrack.staffattendance.service.LeaveRequestService;
import com.edutrack.staffattendance.service.SkippedClassService;
import com.edutrack.staffattendance.service.TeacherAttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class StaffAttendanceController {

    private final TeacherAttendanceService teacherAttendanceService;
    private final LeaveRequestService leaveRequestService;
    private final SkippedClassService skippedClassService;

    @GetMapping("/api/teacher-attendance/me")
    public ApiResponse<MyTodayStatusResponse> myToday() {
        return ApiResponse.ok(teacherAttendanceService.getMyToday());
    }

    @PostMapping("/api/teacher-attendance/me")
    public ApiResponse<Void> setMyStatus(@Valid @RequestBody SetMyStatusRequest request) {
        teacherAttendanceService.setMyStatus(request.status());
        return ApiResponse.ok(null);
    }

    @PostMapping(value = "/api/leave-requests", consumes = "multipart/form-data")
    public ApiResponse<LeaveRequestResponse> applyForLeave(
            @RequestParam LeaveType leaveType,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam String reason,
            @RequestParam(required = false) MultipartFile document
    ) {
        return ApiResponse.ok(leaveRequestService.apply(leaveType, fromDate, toDate, reason, document));
    }

    @GetMapping("/api/leave-requests/mine")
    public ApiResponse<List<LeaveRequestResponse>> myLeaveRequests() {
        return ApiResponse.ok(leaveRequestService.listMine());
    }

    @GetMapping("/api/leave-requests/balance")
    public ApiResponse<LeaveBalanceResponse> myLeaveBalance() {
        return ApiResponse.ok(leaveRequestService.getMyBalance());
    }

    @PostMapping("/api/leave-requests/{id}/cancel")
    public ApiResponse<LeaveRequestResponse> cancel(@PathVariable Long id) {
        return ApiResponse.ok(leaveRequestService.cancel(id));
    }

    @PostMapping("/api/leave-requests/{id}/approve")
    public ApiResponse<LeaveRequestResponse> approve(@PathVariable Long id) {
        return ApiResponse.ok(leaveRequestService.review(id, true));
    }

    @PostMapping("/api/leave-requests/{id}/reject")
    public ApiResponse<LeaveRequestResponse> reject(@PathVariable Long id) {
        return ApiResponse.ok(leaveRequestService.review(id, false));
    }

    @PostMapping("/api/skipped-classes")
    public ApiResponse<SkippedClassReportResponse> reportSkippedClass(@Valid @RequestBody CreateSkipReportRequest request) {
        return ApiResponse.ok(skippedClassService.submit(request));
    }
}
