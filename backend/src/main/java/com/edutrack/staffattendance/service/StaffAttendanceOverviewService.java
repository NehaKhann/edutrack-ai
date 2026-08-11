package com.edutrack.staffattendance.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.CurrentUser;
import com.edutrack.staffattendance.dto.LeaveRequestResponse;
import com.edutrack.staffattendance.dto.SkippedClassReportResponse;
import com.edutrack.staffattendance.dto.TeacherAttendanceDetailResponse;
import com.edutrack.staffattendance.dto.TeacherAttendanceTodayRow;
import com.edutrack.staffattendance.entity.LeaveRequest;
import com.edutrack.staffattendance.entity.LeaveStatus;
import com.edutrack.staffattendance.entity.TeacherAttendanceRecord;
import com.edutrack.staffattendance.entity.TeacherAttendanceStatus;
import com.edutrack.staffattendance.repository.LeaveRequestRepository;
import com.edutrack.staffattendance.repository.SkippedClassReportRepository;
import com.edutrack.staffattendance.repository.TeacherAttendanceRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class StaffAttendanceOverviewService {

    private final UserRepository userRepository;
    private final TeacherAttendanceRecordRepository teacherAttendanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final SkippedClassReportRepository skippedClassReportRepository;

    @Transactional(readOnly = true)
    public List<TeacherAttendanceTodayRow> today() {
        Long schoolId = CurrentUser.get().getSchoolId();
        LocalDate today = LocalDate.now();
        List<User> teachers = userRepository.findBySchoolIdAndRole(schoolId, Role.TEACHER);

        return teachers.stream()
                .sorted(Comparator.comparing(User::getName))
                .map(teacher -> {
                    Optional<TeacherAttendanceRecord> record = teacherAttendanceRepository.findByTeacherIdAndAttendanceDate(teacher.getId(), today);
                    String status = record.map(r -> r.getStatus().name()).orElse(null);

                    Optional<LeaveRequest> leave = leaveRequestRepository
                            .findByTeacherIdAndFromDateLessThanEqualAndToDateGreaterThanEqual(teacher.getId(), today, today)
                            .stream()
                            .filter(l -> l.getStatus() != LeaveStatus.REJECTED)
                            .findFirst();

                    int skippedCount = skippedClassReportRepository.findByTeacherIdAndReportDate(teacher.getId(), today).size();
                    boolean absentWithoutLeave = TeacherAttendanceStatus.ABSENT.name().equals(status) && leave.isEmpty();

                    return new TeacherAttendanceTodayRow(
                            teacher.getId(), teacher.getName(), status,
                            record.map(r -> r.getMethod().name()).orElse(null),
                            leave.map(LeaveRequest::getReason).orElse(null),
                            leave.filter(l -> l.getStatus() == LeaveStatus.PENDING).map(LeaveRequest::getId).orElse(null),
                            skippedCount, absentWithoutLeave
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public TeacherAttendanceDetailResponse detail(Long teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> ApiException.notFound("Teacher not found"));
        if (!teacher.getSchool().getId().equals(CurrentUser.get().getSchoolId()) || teacher.getRole() != Role.TEACHER) {
            throw ApiException.notFound("Teacher not found");
        }

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        Optional<TeacherAttendanceRecord> todayRecord = teacherAttendanceRepository.findByTeacherIdAndAttendanceDate(teacherId, today);
        Optional<LeaveRequest> todayLeave = leaveRequestRepository
                .findByTeacherIdAndFromDateLessThanEqualAndToDateGreaterThanEqual(teacherId, today, today)
                .stream().filter(l -> l.getStatus() != LeaveStatus.REJECTED).findFirst();

        List<SkippedClassReportResponse> skippedClasses = skippedClassReportRepository.findByTeacherIdOrderByReportDateDesc(teacherId)
                .stream().map(SkippedClassReportResponse::from).toList();

        List<LeaveRequest> allLeaves = leaveRequestRepository.findByTeacherIdOrderByFromDateDesc(teacherId);
        List<LeaveRequestResponse> leaveHistory = allLeaves.stream().map(LeaveRequestResponse::from).toList();

        List<TeacherAttendanceRecord> monthRecords = teacherAttendanceRepository.findByTeacherIdAndAttendanceDateBetween(teacherId, monthStart, today);
        int presentDays = (int) monthRecords.stream().filter(r -> r.getStatus() == TeacherAttendanceStatus.PRESENT).count();
        int markedDays = monthRecords.size();
        double attendancePercent = markedDays == 0 ? 0.0 : Math.round((presentDays * 1000.0) / markedDays) / 10.0;

        int leavesTaken = (int) allLeaves.stream()
                .filter(l -> l.getStatus() == LeaveStatus.APPROVED)
                .filter(l -> !l.getToDate().isBefore(monthStart) && !l.getFromDate().isAfter(today))
                .count();
        int classesSkipped = (int) skippedClassReportRepository.countByTeacherIdAndReportDateBetween(teacherId, monthStart, today);

        return new TeacherAttendanceDetailResponse(
                teacher.getId(), teacher.getName(),
                todayRecord.map(r -> r.getStatus().name()).orElse(null),
                todayRecord.map(r -> r.getMethod().name()).orElse(null),
                todayRecord.map(TeacherAttendanceRecord::getMarkedAt).orElse(null),
                todayLeave.map(LeaveRequest::getReason).orElse(null),
                skippedClasses, leaveHistory,
                presentDays, leavesTaken, classesSkipped, attendancePercent
        );
    }
}
