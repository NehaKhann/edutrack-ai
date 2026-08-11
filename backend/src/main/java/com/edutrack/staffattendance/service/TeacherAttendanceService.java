package com.edutrack.staffattendance.service;

import com.edutrack.org.entity.User;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.CurrentUser;
import com.edutrack.staffattendance.dto.MyTodayStatusResponse;
import com.edutrack.staffattendance.entity.AttendanceMethod;
import com.edutrack.staffattendance.entity.TeacherAttendanceRecord;
import com.edutrack.staffattendance.entity.TeacherAttendanceStatus;
import com.edutrack.staffattendance.repository.TeacherAttendanceRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class TeacherAttendanceService {

    private final TeacherAttendanceRecordRepository attendanceRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public MyTodayStatusResponse getMyToday() {
        Long teacherId = CurrentUser.get().getUserId();
        return attendanceRepository.findByTeacherIdAndAttendanceDate(teacherId, LocalDate.now())
                .map(r -> new MyTodayStatusResponse(r.getStatus().name(), r.getMethod().name(), r.getMarkedAt()))
                .orElseGet(() -> new MyTodayStatusResponse(null, null, null));
    }

    /** Manual self-marking — used by the "Mark manually instead" fallback path. */
    @Transactional
    public void setMyStatus(TeacherAttendanceStatus status) {
        setStatusForTeacher(CurrentUser.get().getUserId(), status, AttendanceMethod.MANUAL);
    }

    /** Marks a teacher present as a result of a successful face-recognition match. */
    @Transactional
    public TeacherAttendanceRecord markPresentViaFaceRecognition(Long teacherId) {
        return setStatusForTeacher(teacherId, TeacherAttendanceStatus.PRESENT, AttendanceMethod.FACE_RECOGNITION);
    }

    private TeacherAttendanceRecord setStatusForTeacher(Long teacherId, TeacherAttendanceStatus status, AttendanceMethod method) {
        LocalDate today = LocalDate.now();
        TeacherAttendanceRecord record = attendanceRepository.findByTeacherIdAndAttendanceDate(teacherId, today)
                .orElseGet(() -> {
                    User teacher = userRepository.findById(teacherId).orElseThrow();
                    return new TeacherAttendanceRecord(teacher, today, status, method);
                });
        record.setStatus(status);
        record.setMethod(method);
        record.setMarkedAt(Instant.now());
        return attendanceRepository.save(record);
    }
}
