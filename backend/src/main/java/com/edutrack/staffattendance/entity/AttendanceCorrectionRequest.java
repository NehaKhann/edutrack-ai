package com.edutrack.staffattendance.entity;

import com.edutrack.org.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "attendance_correction_request")
@Getter
@Setter
@NoArgsConstructor
public class AttendanceCorrectionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    /** What the teacher believes the status should be — optional, they may just leave a note. */
    @Enumerated(EnumType.STRING)
    @Column(name = "requested_status", length = 12)
    private TeacherAttendanceStatus requestedStatus;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private LeaveStatus status = LeaveStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public AttendanceCorrectionRequest(User teacher, LocalDate attendanceDate, TeacherAttendanceStatus requestedStatus, String reason) {
        this.teacher = teacher;
        this.attendanceDate = attendanceDate;
        this.requestedStatus = requestedStatus;
        this.reason = reason;
    }
}
