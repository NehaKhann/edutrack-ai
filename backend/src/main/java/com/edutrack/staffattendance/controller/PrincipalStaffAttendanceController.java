package com.edutrack.staffattendance.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.staffattendance.dto.AttendanceCorrectionRequestResponse;
import com.edutrack.staffattendance.dto.AttendancePolicyResponse;
import com.edutrack.staffattendance.dto.OverrideStatusRequest;
import com.edutrack.staffattendance.dto.TeacherAttendanceDetailResponse;
import com.edutrack.staffattendance.dto.TeacherAttendanceTodayRow;
import com.edutrack.staffattendance.dto.UpdateAttendancePolicyRequest;
import com.edutrack.staffattendance.service.AttendanceCorrectionService;
import com.edutrack.staffattendance.service.LeaveRequestService;
import com.edutrack.staffattendance.service.StaffAttendanceOverviewService;
import com.edutrack.staffattendance.service.TeacherAttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class PrincipalStaffAttendanceController {

    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final StaffAttendanceOverviewService overviewService;
    private final TeacherAttendanceService teacherAttendanceService;
    private final AttendanceCorrectionService attendanceCorrectionService;
    private final LeaveRequestService leaveRequestService;

    @GetMapping("/api/principal/teacher-attendance/today")
    public ApiResponse<List<TeacherAttendanceTodayRow>> today() {
        return ApiResponse.ok(overviewService.today());
    }

    @GetMapping("/api/principal/teacher-attendance/{teacherId}/detail")
    public ApiResponse<TeacherAttendanceDetailResponse> detail(@PathVariable Long teacherId) {
        return ApiResponse.ok(overviewService.detail(teacherId));
    }

    @PutMapping("/api/principal/attendance-policy")
    public ApiResponse<AttendancePolicyResponse> updatePolicy(@Valid @RequestBody UpdateAttendancePolicyRequest request) {
        return ApiResponse.ok(teacherAttendanceService.updatePolicy(request.cutoffTime(), request.autoAbsentTime()));
    }

    /** Corrects a teacher's attendance for today — the only path that can override an already-marked record. */
    @PostMapping("/api/principal/teacher-attendance/{teacherId}/override")
    public ApiResponse<Void> override(@PathVariable Long teacherId, @Valid @RequestBody OverrideStatusRequest request) {
        teacherAttendanceService.overrideStatus(teacherId, request.status(), request.time());
        return ApiResponse.ok(null);
    }

    @GetMapping("/api/principal/attendance-corrections/pending")
    public ApiResponse<List<AttendanceCorrectionRequestResponse>> pendingCorrections() {
        return ApiResponse.ok(attendanceCorrectionService.listPending());
    }

    @PostMapping("/api/principal/attendance-corrections/{id}/approve")
    public ApiResponse<AttendanceCorrectionRequestResponse> approveCorrection(@PathVariable Long id) {
        return ApiResponse.ok(attendanceCorrectionService.review(id, true));
    }

    @PostMapping("/api/principal/attendance-corrections/{id}/reject")
    public ApiResponse<AttendanceCorrectionRequestResponse> rejectCorrection(@PathVariable Long id) {
        return ApiResponse.ok(attendanceCorrectionService.review(id, false));
    }

    @GetMapping("/api/principal/teacher-attendance/export")
    public ResponseEntity<byte[]> exportAttendance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        byte[] xlsx = teacherAttendanceService.exportAttendanceXlsx(from, to);
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=attendance-" + from + "-to-" + to + ".xlsx")
                .body(xlsx);
    }

    @GetMapping("/api/principal/leave-requests/export")
    public ResponseEntity<byte[]> exportLeave(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        byte[] xlsx = leaveRequestService.exportLeaveXlsx(from, to);
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=leave-" + from + "-to-" + to + ".xlsx")
                .body(xlsx);
    }
}
