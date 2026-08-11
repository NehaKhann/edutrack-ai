package com.edutrack.staffattendance.repository;

import com.edutrack.staffattendance.entity.LeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findByTeacherIdOrderByFromDateDesc(Long teacherId);
    List<LeaveRequest> findByTeacherIdAndFromDateLessThanEqualAndToDateGreaterThanEqual(Long teacherId, LocalDate date, LocalDate sameDate);
    List<LeaveRequest> findByTeacherSchoolIdAndFromDateLessThanEqualAndToDateGreaterThanEqual(Long schoolId, LocalDate date, LocalDate sameDate);
}
