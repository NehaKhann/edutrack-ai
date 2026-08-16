package com.edutrack.staffattendance.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.staffattendance.dto.AttendanceCorrectionRequestResponse;
import com.edutrack.staffattendance.dto.AttendancePolicyResponse;
import com.edutrack.staffattendance.dto.CreateSkipReportRequest;
import com.edutrack.staffattendance.dto.LeaveBalanceResponse;
import com.edutrack.staffattendance.dto.MyAttendanceSummaryResponse;
import com.edutrack.staffattendance.dto.LeaveRequestResponse;
import com.edutrack.staffattendance.dto.MyTodayStatusResponse;
import com.edutrack.staffattendance.dto.SetMyStatusRequest;
import com.edutrack.staffattendance.dto.SkippedClassReportResponse;
import com.edutrack.staffattendance.dto.SubmitCorrectionRequest;
import com.edutrack.staffattendance.entity.LeaveType;
import com.edutrack.staffattendance.service.AttendanceCorrectionService;
import com.edutrack.staffattendance.service.LeaveRequestService;
import com.edutrack.staffattendance.service.SkippedClassService;
import com.edutrack.staffattendance.service.TeacherAttendanceService;
import com.edutrack.security.CurrentUser;
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
    private final AttendanceCorrectionService attendanceCorrectionService;

    @GetMapping("/api/teacher-attendance/me")
    public ApiResponse<MyTodayStatusResponse> myToday() {
        return ApiResponse.ok(teacherAttendanceService.getMyToday());
    }

    @GetMapping("/api/teacher-attendance/me/summary")
    public ApiResponse<MyAttendanceSummaryResponse> mySummary() {
        return ApiResponse.ok(teacherAttendanceService.getMySummary());
    }

    /** Readable by any authenticated staff member so the marking page can display the policy. */
    @GetMapping("/api/teacher-attendance/policy")
    public ApiResponse<AttendancePolicyResponse> policy() {
        return ApiResponse.ok(teacherAttendanceService.getPolicy(CurrentUser.get().getSchoolId()));
    }

    @PostMapping("/api/teacher-attendance/me")
    public ApiResponse<Void> setMyStatus(@Valid @RequestBody SetMyStatusRequest request) {
        teacherAttendanceService.setMyStatus(request.status());
        return ApiResponse.ok(null);
    }

    /** Marks the current authenticated teacher present after a successful native fingerprint prompt (Android app only). */
    @PostMapping("/api/teacher-attendance/me/fingerprint")
    public ApiResponse<Void> markFingerprint() {
        teacherAttendanceService.markPresentViaFingerprint(CurrentUser.get().getUserId());
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

    @PostMapping("/api/attendance-corrections")
    public ApiResponse<AttendanceCorrectionRequestResponse> submitCorrection(@Valid @RequestBody SubmitCorrectionRequest request) {
        return ApiResponse.ok(attendanceCorrectionService.submit(request.attendanceDate(), request.requestedStatus(), request.reason()));
    }

    @GetMapping("/api/attendance-corrections/mine")
    public ApiResponse<List<AttendanceCorrectionRequestResponse>> myCorrections() {
        return ApiResponse.ok(attendanceCorrectionService.listMine());
    }

    @PostMapping("/api/attendance-corrections/{id}/cancel")
    public ApiResponse<AttendanceCorrectionRequestResponse> cancelCorrection(@PathVariable Long id) {
        return ApiResponse.ok(attendanceCorrectionService.cancel(id));
    }
}
