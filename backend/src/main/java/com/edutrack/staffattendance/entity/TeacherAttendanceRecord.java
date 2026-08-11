package com.edutrack.staffattendance.entity;

import com.edutrack.org.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "teacher_attendance_record")
@Getter
@Setter
@NoArgsConstructor
public class TeacherAttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private TeacherAttendanceStatus status;

    @Column(name = "marked_at", nullable = false)
    private Instant markedAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceMethod method = AttendanceMethod.MANUAL;

    public TeacherAttendanceRecord(User teacher, LocalDate attendanceDate, TeacherAttendanceStatus status, AttendanceMethod method) {
        this.teacher = teacher;
        this.attendanceDate = attendanceDate;
        this.status = status;
        this.method = method;
    }
}
