package com.edutrack.staffattendance.repository;

import com.edutrack.staffattendance.entity.AttendanceCorrectionRequest;
import com.edutrack.staffattendance.entity.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttendanceCorrectionRequestRepository extends JpaRepository<AttendanceCorrectionRequest, Long> {
    List<AttendanceCorrectionRequest> findByTeacherIdOrderByCreatedAtDesc(Long teacherId);
    List<AttendanceCorrectionRequest> findByTeacherSchoolIdAndStatusOrderByCreatedAtDesc(Long schoolId, LeaveStatus status);
}
