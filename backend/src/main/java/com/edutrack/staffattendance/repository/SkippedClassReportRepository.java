package com.edutrack.staffattendance.repository;

import com.edutrack.staffattendance.entity.SkippedClassReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface SkippedClassReportRepository extends JpaRepository<SkippedClassReport, Long> {
    List<SkippedClassReport> findByTeacherIdOrderByReportDateDesc(Long teacherId);
    List<SkippedClassReport> findByTeacherIdAndReportDate(Long teacherId, LocalDate reportDate);
    List<SkippedClassReport> findByTeacherSchoolIdAndReportDate(Long schoolId, LocalDate reportDate);
    long countByTeacherIdAndReportDateBetween(Long teacherId, LocalDate from, LocalDate to);
}
