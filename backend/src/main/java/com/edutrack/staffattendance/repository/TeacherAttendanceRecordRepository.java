package com.edutrack.staffattendance.repository;

import com.edutrack.staffattendance.entity.TeacherAttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TeacherAttendanceRecordRepository extends JpaRepository<TeacherAttendanceRecord, Long> {
    Optional<TeacherAttendanceRecord> findByTeacherIdAndAttendanceDate(Long teacherId, LocalDate attendanceDate);
    List<TeacherAttendanceRecord> findByTeacherIdAndAttendanceDateBetween(Long teacherId, LocalDate from, LocalDate to);
    List<TeacherAttendanceRecord> findByTeacherSchoolIdAndAttendanceDate(Long schoolId, LocalDate attendanceDate);
    List<TeacherAttendanceRecord> findByTeacherSchoolIdAndAttendanceDateBetween(Long schoolId, LocalDate from, LocalDate to);
}
