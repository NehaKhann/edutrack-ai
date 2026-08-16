package com.edutrack.staffattendance.service;

import com.edutrack.audit.entity.AuditAction;
import com.edutrack.audit.service.AuditLogService;
import com.edutrack.common.ApiException;
import com.edutrack.notification.service.NotificationService;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.staffattendance.dto.AttendanceCorrectionRequestResponse;
import com.edutrack.staffattendance.entity.AttendanceCorrectionRequest;
import com.edutrack.staffattendance.entity.LeaveStatus;
import com.edutrack.staffattendance.entity.TeacherAttendanceStatus;
import com.edutrack.staffattendance.repository.AttendanceCorrectionRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceCorrectionService {

    private final AttendanceCorrectionRequestRepository correctionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    private static final int MAX_PAST_DAYS = 30;

    @Transactional
    public AttendanceCorrectionRequestResponse submit(LocalDate attendanceDate, TeacherAttendanceStatus requestedStatus, String reason) {
        LocalDate today = LocalDate.now();
        if (attendanceDate.isAfter(today)) {
            throw ApiException.badRequest("You can't request a correction for a future date.");
        }
        if (attendanceDate.isBefore(today.minusDays(MAX_PAST_DAYS))) {
            throw ApiException.badRequest("Corrections can only be requested for the last " + MAX_PAST_DAYS + " days.");
        }

        AuthenticatedUser me = CurrentUser.get();
        User teacher = userRepository.findById(me.getUserId()).orElseThrow();
        AttendanceCorrectionRequest request = new AttendanceCorrectionRequest(teacher, attendanceDate, requestedStatus, reason);
        AttendanceCorrectionRequest saved = correctionRepository.save(request);

        // correctionId is embedded so the notification can be retracted for everyone once this specific
        // request is resolved, instead of lingering in the bell after it's already been decided.
        String link = "/principal/teacher-attendance?teacherId=" + teacher.getId() + "&correctionId=" + saved.getId();
        for (User principal : userRepository.findBySchoolIdAndRoleAndActive(me.getSchoolId(), Role.PRINCIPAL, true)) {
            notificationService.notify(principal, teacher.getName() + " requested an attendance correction for " + attendanceDate, link);
        }

        return AttendanceCorrectionRequestResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionRequestResponse> listMine() {
        Long teacherId = CurrentUser.get().getUserId();
        return correctionRepository.findByTeacherIdOrderByCreatedAtDesc(teacherId).stream()
                .map(AttendanceCorrectionRequestResponse::from).toList();
    }

    @Transactional
    public AttendanceCorrectionRequestResponse cancel(Long requestId) {
        AttendanceCorrectionRequest request = correctionRepository.findById(requestId)
                .orElseThrow(() -> ApiException.notFound("Correction request not found"));
        if (!request.getTeacher().getId().equals(CurrentUser.get().getUserId())) {
            throw ApiException.forbidden("You can only cancel your own correction requests");
        }
        if (request.getStatus() != LeaveStatus.PENDING) {
            throw ApiException.conflict("Only a pending correction request can be cancelled");
        }
        request.setStatus(LeaveStatus.CANCELLED);
        AttendanceCorrectionRequestResponse saved = AttendanceCorrectionRequestResponse.from(correctionRepository.save(request));
        notificationService.retractByLinkFragment("correctionId=" + requestId);
        auditLogService.record(AuditAction.CORRECTION_CANCELLED, "CORRECTION", requestId, request.getTeacher().getName(),
                "Correction request for " + request.getAttendanceDate() + " cancelled by the requester");
        return saved;
    }

    @Transactional(readOnly = true)
    public List<AttendanceCorrectionRequestResponse> listPending() {
        Long schoolId = CurrentUser.get().getSchoolId();
        return correctionRepository.findByTeacherSchoolIdAndStatusOrderByCreatedAtDesc(schoolId, LeaveStatus.PENDING).stream()
                .map(AttendanceCorrectionRequestResponse::from).toList();
    }

    /** Approving/rejecting only records the decision — the Principal still applies the actual fix via {@link TeacherAttendanceService#overrideStatus}. */
    @Transactional
    public AttendanceCorrectionRequestResponse review(Long requestId, boolean approve) {
        assertPrincipal();
        AttendanceCorrectionRequest request = correctionRepository.findById(requestId)
                .orElseThrow(() -> ApiException.notFound("Correction request not found"));
        if (!request.getTeacher().getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Correction request not found");
        }
        if (request.getStatus() != LeaveStatus.PENDING) {
            throw ApiException.conflict("This correction request has already been reviewed");
        }
        User reviewer = userRepository.findById(CurrentUser.get().getUserId()).orElseThrow();
        request.setStatus(approve ? LeaveStatus.APPROVED : LeaveStatus.REJECTED);
        request.setReviewedBy(reviewer);
        request.setReviewedAt(Instant.now());
        AttendanceCorrectionRequest saved = correctionRepository.save(request);

        // Now resolved — retract the original "awaiting review" notification for every principal who got
        // it, so a decided request can't keep showing up as if it were still pending.
        notificationService.retractByLinkFragment("correctionId=" + requestId);

        String message = approve
                ? "Your correction request for " + request.getAttendanceDate() + " was approved — your Principal will update it shortly."
                : "Your correction request for " + request.getAttendanceDate() + " was rejected.";
        notificationService.notify(request.getTeacher(), message, "/teacher/my-attendance");

        auditLogService.record(
                approve ? AuditAction.CORRECTION_APPROVED : AuditAction.CORRECTION_REJECTED,
                "CORRECTION", requestId, request.getTeacher().getName(),
                "Correction request for " + request.getAttendanceDate() + " " + (approve ? "approved" : "rejected")
        );

        return AttendanceCorrectionRequestResponse.from(saved);
    }

    private void assertPrincipal() {
        Role role = CurrentUser.get().getRole();
        if (role != Role.PRINCIPAL && role != Role.ADMIN) {
            throw ApiException.forbidden("Only a Principal can review correction requests");
        }
    }
}
