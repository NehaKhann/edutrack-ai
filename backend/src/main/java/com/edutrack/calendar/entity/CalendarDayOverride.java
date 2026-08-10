package com.edutrack.calendar.entity;

import com.edutrack.org.entity.School;
import com.edutrack.org.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "calendar_day_override", uniqueConstraints = @UniqueConstraint(columnNames = {"school_id", "date"}))
@Getter
@Setter
@NoArgsConstructor
public class CalendarDayOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(nullable = false)
    private LocalDate date;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DayStatus status;

    private String reason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by")
    private User changedBy;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt = Instant.now();

    public CalendarDayOverride(School school, LocalDate date, DayStatus status, String reason, User changedBy) {
        this.school = school;
        this.date = date;
        this.status = status;
        this.reason = reason;
        this.changedBy = changedBy;
    }
}
