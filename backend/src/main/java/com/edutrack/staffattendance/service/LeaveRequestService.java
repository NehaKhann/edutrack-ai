package com.edutrack.staffattendance.service;

import com.edutrack.audit.entity.AuditAction;
import com.edutrack.audit.service.AuditLogService;
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
import com.edutrack.storage.UploadGuard;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
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
    private final AuditLogService auditLogService;

    @Transactional
    public LeaveRequestResponse apply(LeaveType leaveType, LocalDate fromDate, LocalDate toDate, String reason, MultipartFile document) {
        if (toDate.isBefore(fromDate)) {
            throw ApiException.badRequest("End date can't be before the start date");
        }
        User teacher = userRepository.findById(CurrentUser.get().getUserId()).orElseThrow();
        LeaveRequest request = new LeaveRequest(teacher, leaveType, fromDate, toDate, reason);
        if (document != null && !document.isEmpty()) {
            UploadGuard.assertSafe(document);
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
        LeaveRequestResponse saved = LeaveRequestResponse.from(leaveRequestRepository.save(request));
        auditLogService.record(AuditAction.LEAVE_CANCELLED, "LEAVE_REQUEST", leaveRequestId, request.getTeacher().getName(),
                request.getLeaveType() + " leave (" + request.getFromDate() + " to " + request.getToDate() + ") cancelled by the requester");
        return saved;
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
        LeaveRequestResponse saved = LeaveRequestResponse.from(leaveRequestRepository.save(request));
        auditLogService.record(
                approve ? AuditAction.LEAVE_APPROVED : AuditAction.LEAVE_REJECTED,
                "LEAVE_REQUEST", leaveRequestId, request.getTeacher().getName(),
                request.getLeaveType() + " leave (" + request.getFromDate() + " to " + request.getToDate() + ") " + (approve ? "approved" : "rejected")
        );
        return saved;
    }

    private void assertPrincipal() {
        Role role = CurrentUser.get().getRole();
        if (role != Role.PRINCIPAL && role != Role.ADMIN) {
            throw ApiException.forbidden("Only a Principal can review leave requests");
        }
    }

    /** Principal-only. Every leave request whose period overlaps the given range, for record-keeping/compliance purposes. */
    @Transactional(readOnly = true)
    public byte[] exportLeaveXlsx(LocalDate from, LocalDate to) {
        assertPrincipal();
        if (to.isBefore(from)) {
            throw ApiException.badRequest("End date can't be before the start date");
        }
        Long schoolId = CurrentUser.get().getSchoolId();
        List<LeaveRequest> requests = leaveRequestRepository.findByTeacherSchoolIdAndFromDateLessThanEqualAndToDateGreaterThanEqual(schoolId, to, from);
        requests.sort(Comparator.comparing(LeaveRequest::getFromDate));

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Leave Requests");
            CellStyle headerStyle = exportHeaderStyle(workbook);
            String[] cols = {"Teacher", "Leave Type", "From", "To", "Reason", "Status", "Reviewed By", "Reviewed At"};
            Row header = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
            }
            DateTimeFormatter tf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.systemDefault());
            int rowIdx = 1;
            for (LeaveRequest r : requests) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(r.getTeacher().getName());
                row.createCell(1).setCellValue(r.getLeaveType().name());
                row.createCell(2).setCellValue(r.getFromDate().toString());
                row.createCell(3).setCellValue(r.getToDate().toString());
                row.createCell(4).setCellValue(r.getReason());
                row.createCell(5).setCellValue(r.getStatus().name());
                row.createCell(6).setCellValue(r.getReviewedBy() != null ? r.getReviewedBy().getName() : "");
                row.createCell(7).setCellValue(r.getReviewedAt() != null ? tf.format(r.getReviewedAt()) : "");
            }
            for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw ApiException.internal("Could not generate leave export", e);
        }
    }

    private CellStyle exportHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }
}
