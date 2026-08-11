package com.edutrack.attendance.repository;

import com.edutrack.attendance.entity.StudentAttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StudentAttendanceRecordRepository extends JpaRepository<StudentAttendanceRecord, Long> {

    List<StudentAttendanceRecord> findByClassSectionIdAndAttendanceDateAndSubjectIsNullAndPeriodIsNull(
            Long classSectionId, LocalDate attendanceDate);

    List<StudentAttendanceRecord> findByClassSectionIdAndAttendanceDateAndSubjectIdAndPeriod(
            Long classSectionId, LocalDate attendanceDate, Long subjectId, Integer period);

    Optional<StudentAttendanceRecord> findByStudentIdAndAttendanceDateAndSubjectIsNullAndPeriodIsNull(
            Long studentId, LocalDate attendanceDate);

    Optional<StudentAttendanceRecord> findByStudentIdAndAttendanceDateAndSubjectIdAndPeriod(
            Long studentId, LocalDate attendanceDate, Long subjectId, Integer period);

    List<StudentAttendanceRecord> findByClassSectionSchoolIdAndAttendanceDateAndSubjectIsNullAndPeriodIsNull(
            Long schoolId, LocalDate attendanceDate);
}
