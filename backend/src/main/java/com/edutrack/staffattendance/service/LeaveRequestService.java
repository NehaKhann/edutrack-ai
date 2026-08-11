package com.edutrack.staffattendance.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.CurrentUser;
import com.edutrack.staffattendance.dto.LeaveBalanceResponse;
import com.edutrack.staffattendance.dto.LeaveRequestResponse;
import com.edutrack.staffattendance.entity.LeaveRequest;
import com.edutrack.staffattendance.entity.LeaveStatus;
import com.edutrack.staffattendance.entity.LeaveType;
import com.edutrack.staffattendance.repository.LeaveRequestRepository;
import com.edutrack.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LeaveRequestService {

    /**
     * Annual day entitlement per leave type. There's no leave-policy management feature yet, so
     * these are fixed defaults rather than a school-configurable policy — called out here so it's
     * an obvious place to wire up real policy data later. "Other" has no tracked balance since
     * it's a catch-all category, not a standard allotted leave type.
     */
    private static final Map<LeaveType, Integer> ANNUAL_ENTITLEMENT_DAYS = new EnumMap<>(Map.of(
            LeaveType.CASUAL, 10,
            LeaveType.SICK, 8,
            LeaveType.EMERGENCY, 3
    ));

    private final LeaveRequestRepository leaveRequestRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public LeaveRequestResponse apply(LeaveType leaveType, LocalDate fromDate, LocalDate toDate, String reason, MultipartFile document) {
        if (toDate.isBefore(fromDate)) {
            throw ApiException.badRequest("End date can't be before the start date");
        }
        User teacher = userRepository.findById(CurrentUser.get().getUserId()).orElseThrow();
        LeaveRequest request = new LeaveRequest(teacher, leaveType, fromDate, toDate, reason);
        if (document != null && !document.isEmpty()) {
            request.setDocumentFileRef(fileStorageService.store(document, "leave-documents"));
            request.setDocumentFilename(document.getOriginalFilename());
        }
        return LeaveRequestResponse.from(leaveRequestRepository.save(request));
    }

    @Transactional(readOnly = true)
    public List<LeaveRequestResponse> listMine() {
        Long teacherId = CurrentUser.get().getUserId();
        return leaveRequestRepository.findByTeacherIdOrderByFromDateDesc(teacherId).stream()
                .map(LeaveRequestResponse::from).toList();
    }

    /** A teacher may withdraw their own request only while it's still awaiting a decision. */
    @Transactional
    public LeaveRequestResponse cancel(Long leaveRequestId) {
        LeaveRequest request = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow(() -> ApiException.notFound("Leave request not found"));
        if (!request.getTeacher().getId().equals(CurrentUser.get().getUserId())) {
            throw ApiException.forbidden("You can only cancel your own leave requests");
        }
        if (request.getStatus() != LeaveStatus.PENDING) {
            throw ApiException.conflict("Only a pending leave request can be cancelled");
        }
        request.setStatus(LeaveStatus.CANCELLED);
        return LeaveRequestResponse.from(leaveRequestRepository.save(request));
    }

    @Transactional(readOnly = true)
    public LeaveBalanceResponse getMyBalance() {
        Long teacherId = CurrentUser.get().getUserId();
        int yearStart = LocalDate.now().getYear();
        LocalDate from = LocalDate.of(yearStart, 1, 1);
        LocalDate to = LocalDate.of(yearStart, 12, 31);

        List<LeaveRequest> approvedThisYear = leaveRequestRepository.findByTeacherIdOrderByFromDateDesc(teacherId).stream()
                .filter(l -> l.getStatus() == LeaveStatus.APPROVED)
                .filter(l -> !l.getToDate().isBefore(from) && !l.getFromDate().isAfter(to))
                .toList();

        List<LeaveBalanceResponse.Balance> balances = ANNUAL_ENTITLEMENT_DAYS.entrySet().stream()
                .map(entry -> {
                    LeaveType type = entry.getKey();
                    int entitlement = entry.getValue();
                    int used = approvedThisYear.stream()
                            .filter(l -> l.getLeaveType() == type)
                            .mapToInt(l -> (int) ChronoUnit.DAYS.between(l.getFromDate(), l.getToDate()) + 1)
                            .sum();
                    return new LeaveBalanceResponse.Balance(type.name(), entitlement, used, Math.max(0, entitlement - used));
                })
                .toList();

        return new LeaveBalanceResponse(balances);
    }

    @Transactional
    public LeaveRequestResponse review(Long leaveRequestId, boolean approve) {
        assertPrincipal();
        LeaveRequest request = leaveRequestRepository.findById(leaveRequestId)
                .orElseThrow(() -> ApiException.notFound("Leave request not found"));
        if (!request.getTeacher().getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Leave request not found");
        }
        if (request.getStatus() != LeaveStatus.PENDING) {
            throw ApiException.conflict("This leave request has already been reviewed");
        }
        User reviewer = userRepository.findById(CurrentUser.get().getUserId()).orElseThrow();
        request.setStatus(approve ? LeaveStatus.APPROVED : LeaveStatus.REJECTED);
        request.setReviewedBy(reviewer);
        request.setReviewedAt(Instant.now());
        return LeaveRequestResponse.from(leaveRequestRepository.save(request));
    }

    private void assertPrincipal() {
        Role role = CurrentUser.get().getRole();
        if (role != Role.PRINCIPAL && role != Role.ADMIN) {
            throw ApiException.forbidden("Only a Principal can review leave requests");
        }
    }
}
