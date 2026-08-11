package com.edutrack.attendance.entity;

import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.entity.Student;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "student_attendance_record")
@Getter
@Setter
@NoArgsConstructor
public class StudentAttendanceRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_section_id", nullable = false)
    private ClassSection classSection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @Column
    private Integer period;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StudentAttendanceStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marked_by", nullable = false)
    private User markedBy;

    @Column(name = "marked_at", nullable = false)
    private Instant markedAt = Instant.now();

    public StudentAttendanceRecord(Student student, ClassSection classSection, Subject subject, Integer period,
                                    LocalDate attendanceDate, StudentAttendanceStatus status, User markedBy) {
        this.student = student;
        this.classSection = classSection;
        this.subject = subject;
        this.period = period;
        this.attendanceDate = attendanceDate;
        this.status = status;
        this.markedBy = markedBy;
    }
}
