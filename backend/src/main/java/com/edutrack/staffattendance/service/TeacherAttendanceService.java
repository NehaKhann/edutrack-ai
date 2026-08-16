package com.edutrack.staffattendance.service;

import com.edutrack.audit.entity.AuditAction;
import com.edutrack.audit.service.AuditLogService;
import com.edutrack.common.ApiException;
import com.edutrack.notification.service.NotificationService;
import com.edutrack.org.entity.School;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.SchoolRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.staffattendance.dto.AttendancePolicyResponse;
import com.edutrack.staffattendance.dto.MyAttendanceSummaryResponse;
import com.edutrack.staffattendance.dto.MyTodayStatusResponse;
import com.edutrack.staffattendance.entity.AttendanceMethod;
import com.edutrack.staffattendance.entity.LeaveStatus;
import com.edutrack.staffattendance.entity.TeacherAttendanceRecord;
import com.edutrack.staffattendance.entity.TeacherAttendanceStatus;
import com.edutrack.staffattendance.repository.LeaveRequestRepository;
import com.edutrack.staffattendance.repository.TeacherAttendanceRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TeacherAttendanceService {

    private final TeacherAttendanceRecordRepository attendanceRepository;
    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

    @Transactional
    public MyTodayStatusResponse getMyToday() {
        AuthenticatedUser me = CurrentUser.get();
        ensureAutoAbsentIfPastCutoff(me.getUserId(), me.getSchoolId());
        return attendanceRepository.findByTeacherIdAndAttendanceDate(me.getUserId(), LocalDate.now())
                .map(r -> new MyTodayStatusResponse(r.getStatus().name(), r.getMethod().name(), r.getMarkedAt()))
                .orElseGet(() -> new MyTodayStatusResponse(null, null, null));
    }

    /** Manual self-marking — used by the "Mark manually instead" fallback path. */
    @Transactional
    public void setMyStatus(TeacherAttendanceStatus status) {
        AuthenticatedUser me = CurrentUser.get();
        setStatusForTeacher(me.getUserId(), me.getSchoolId(), status, AttendanceMethod.MANUAL);
    }

    /** Marks a teacher present as a result of a successful face-recognition match. */
    @Transactional
    public TeacherAttendanceRecord markPresentViaFaceRecognition(Long teacherId) {
        return setStatusForTeacher(teacherId, CurrentUser.get().getSchoolId(), TeacherAttendanceStatus.PRESENT, AttendanceMethod.FACE_RECOGNITION);
    }

    /** Marks a teacher present as a result of a successful native-device fingerprint prompt (Android app only). */
    @Transactional
    public TeacherAttendanceRecord markPresentViaFingerprint(Long teacherId) {
        return setStatusForTeacher(teacherId, CurrentUser.get().getSchoolId(), TeacherAttendanceStatus.PRESENT, AttendanceMethod.FINGERPRINT);
    }

    /** This week's status breakdown (Mon-through-today) and this month's attendance rate, for the "My Attendance" summary row. */
    @Transactional(readOnly = true)
    public MyAttendanceSummaryResponse getMySummary() {
        Long teacherId = CurrentUser.get().getUserId();
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate monthStart = today.withDayOfMonth(1);

        List<TeacherAttendanceRecord> weekRecords = attendanceRepository.findByTeacherIdAndAttendanceDateBetween(teacherId, weekStart, today);
        List<TeacherAttendanceRecord> monthRecords = attendanceRepository.findByTeacherIdAndAttendanceDateBetween(teacherId, monthStart, today);

        long weekPresent = countByStatus(weekRecords, TeacherAttendanceStatus.PRESENT);
        long weekAbsent = countByStatus(weekRecords, TeacherAttendanceStatus.ABSENT);
        long weekLate = countByStatus(weekRecords, TeacherAttendanceStatus.LATE);
        long weekOnLeave = countByStatus(weekRecords, TeacherAttendanceStatus.ON_LEAVE);
        long weekHalfDay = countByStatus(weekRecords, TeacherAttendanceStatus.HALF_DAY);

        long monthGood = countByStatus(monthRecords, TeacherAttendanceStatus.PRESENT) + countByStatus(monthRecords, TeacherAttendanceStatus.LATE);
        int monthPercent = monthRecords.isEmpty() ? 0 : Math.round(monthGood * 100f / monthRecords.size());

        return new MyAttendanceSummaryResponse(weekPresent, weekAbsent, weekLate, weekOnLeave, weekHalfDay, monthPercent);
    }

    @Transactional(readOnly = true)
    public AttendancePolicyResponse getPolicy(Long schoolId) {
        School school = schoolRepository.findById(schoolId).orElseThrow();
        return new AttendancePolicyResponse(school.getAttendanceCutoffTime(), school.getAttendanceAutoAbsentTime());
    }

    /** Principal-only: sets this school's cutoff/auto-absent times. */
    @Transactional
    public AttendancePolicyResponse updatePolicy(LocalTime cutoffTime, LocalTime autoAbsentTime) {
        School school = schoolRepository.findById(CurrentUser.get().getSchoolId()).orElseThrow();
        LocalTime oldCutoff = school.getAttendanceCutoffTime();
        LocalTime oldAutoAbsent = school.getAttendanceAutoAbsentTime();
        school.setAttendanceCutoffTime(cutoffTime);
        school.setAttendanceAutoAbsentTime(autoAbsentTime);
        schoolRepository.save(school);
        auditLogService.record(AuditAction.ATTENDANCE_POLICY_UPDATED, "SCHOOL", school.getId(), school.getName(),
                "Cutoff " + oldCutoff + " → " + cutoffTime + ", auto-absent " + oldAutoAbsent + " → " + autoAbsentTime);
        return new AttendancePolicyResponse(cutoffTime, autoAbsentTime);
    }

    /**
     * Principal-only correction — the only path that bypasses the single-mark-per-day guard.
     * {@code time} is the actual/tentative time the Principal is recording this against (e.g. when the
     * teacher says they arrived at 11:15) — deliberately never defaulted to "now", since the Principal
     * may be reviewing and applying this well after the fact.
     */
    @Transactional
    public void overrideStatus(Long teacherId, TeacherAttendanceStatus status, LocalTime time) {
        User teacher = userRepository.findById(teacherId).orElseThrow(() -> ApiException.notFound("Teacher not found"));
        if (!teacher.getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Teacher not found");
        }
        LocalDate today = LocalDate.now();
        TeacherAttendanceRecord record = attendanceRepository.findByTeacherIdAndAttendanceDate(teacherId, today)
                .orElseGet(() -> new TeacherAttendanceRecord(teacher, today, status, AttendanceMethod.PRINCIPAL_OVERRIDE));
        record.setStatus(status);
        record.setMethod(AttendanceMethod.PRINCIPAL_OVERRIDE);
        record.setMarkedAt(today.atTime(time).atZone(ZoneId.systemDefault()).toInstant());
        attendanceRepository.save(record);

        notificationService.notify(
                teacher,
                "Your attendance for " + today + " has been updated to " + status.name() + " (" + time + ") by your Principal.",
                "/teacher/my-attendance"
        );

        auditLogService.record(AuditAction.ATTENDANCE_OVERRIDDEN, "TEACHER", teacherId, teacher.getName(),
                "Attendance for " + today + " set to " + status.name() + " at " + time);
    }

    /**
     * If a teacher has no attendance record at all for today and the school's auto-absent cutoff has
     * passed, records them Absent automatically — with no covering leave, this is exactly what the
     * Principal dashboard already treats as "absent without leave". Called lazily (on read) rather
     * than relying purely on a scheduled job, since Render's free tier can sleep the dyno right
     * through the cutoff time — see {@link AttendanceAutoMarkScheduler} for the best-effort sweep.
     */
    @Transactional
    public void ensureAutoAbsentIfPastCutoff(Long teacherId, Long schoolId) {
        LocalDate today = LocalDate.now();
        if (attendanceRepository.findByTeacherIdAndAttendanceDate(teacherId, today).isPresent()) {
            return;
        }
        School school = schoolRepository.findById(schoolId).orElseThrow();
        if (LocalTime.now().isBefore(school.getAttendanceAutoAbsentTime())) {
            return;
        }
        boolean onLeave = leaveRequestRepository
                .findByTeacherIdAndFromDateLessThanEqualAndToDateGreaterThanEqual(teacherId, today, today)
                .stream()
                .anyMatch(l -> l.getStatus() != LeaveStatus.REJECTED);
        if (onLeave) {
            return;
        }
        User teacher = userRepository.findById(teacherId).orElseThrow();
        attendanceRepository.save(new TeacherAttendanceRecord(teacher, today, TeacherAttendanceStatus.ABSENT, AttendanceMethod.AUTO));
    }

    /** Principal-only. Flat one-row-per-record export for record-keeping/compliance purposes. */
    @Transactional(readOnly = true)
    public byte[] exportAttendanceXlsx(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            throw ApiException.badRequest("End date can't be before the start date");
        }
        Long schoolId = CurrentUser.get().getSchoolId();
        List<TeacherAttendanceRecord> records = attendanceRepository.findByTeacherSchoolIdAndAttendanceDateBetween(schoolId, from, to);
        records.sort(Comparator.comparing(TeacherAttendanceRecord::getAttendanceDate).thenComparing(r -> r.getTeacher().getName()));

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Attendance");
            CellStyle headerStyle = exportHeaderStyle(workbook);
            String[] cols = {"Date", "Teacher", "Status", "Method", "Marked At"};
            Row header = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
            }
            DateTimeFormatter tf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(ZoneId.systemDefault());
            int rowIdx = 1;
            for (TeacherAttendanceRecord r : records) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(r.getAttendanceDate().toString());
                row.createCell(1).setCellValue(r.getTeacher().getName());
                row.createCell(2).setCellValue(r.getStatus().name());
                row.createCell(3).setCellValue(r.getMethod().name());
                row.createCell(4).setCellValue(tf.format(r.getMarkedAt()));
            }
            for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw ApiException.internal("Could not generate attendance export", e);
        }
    }

    private CellStyle exportHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private long countByStatus(List<TeacherAttendanceRecord> records, TeacherAttendanceStatus status) {
        return records.stream().filter(r -> r.getStatus() == status).count();
    }

    private TeacherAttendanceRecord setStatusForTeacher(Long teacherId, Long schoolId, TeacherAttendanceStatus status, AttendanceMethod method) {
        LocalDate today = LocalDate.now();
        if (attendanceRepository.findByTeacherIdAndAttendanceDate(teacherId, today).isPresent()) {
            throw ApiException.conflict("Attendance already marked for today — ask your Principal to correct it if this was a mistake.");
        }

        TeacherAttendanceStatus effectiveStatus = status;
        if (status == TeacherAttendanceStatus.PRESENT) {
            School school = schoolRepository.findById(schoolId).orElseThrow();
            if (LocalTime.now().isAfter(school.getAttendanceCutoffTime())) {
                effectiveStatus = TeacherAttendanceStatus.LATE;
            }
        }

        User teacher = userRepository.findById(teacherId).orElseThrow();
        TeacherAttendanceRecord record = new TeacherAttendanceRecord(teacher, today, effectiveStatus, method);
        record.setMarkedAt(Instant.now());
        return attendanceRepository.save(record);
    }
}
