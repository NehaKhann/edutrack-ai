package com.edutrack.staffattendance.entity;

import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "skipped_class_report")
@Getter
@Setter
@NoArgsConstructor
public class SkippedClassReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column
    private Integer period;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "substitute_teacher_id")
    private User substituteTeacher;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public SkippedClassReport(User teacher, Subject subject, LocalDate reportDate, Integer period, String reason) {
        this.teacher = teacher;
        this.subject = subject;
        this.reportDate = reportDate;
        this.period = period;
        this.reason = reason;
    }
}
