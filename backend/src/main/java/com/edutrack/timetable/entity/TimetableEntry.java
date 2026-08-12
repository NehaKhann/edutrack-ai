package com.edutrack.timetable.entity;

import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.Instant;

@Entity
@Table(name = "timetable_entry")
@Getter
@Setter
@NoArgsConstructor
public class TimetableEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_section_id", nullable = false)
    private ClassSection classSection;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false)
    private DayOfWeek dayOfWeek;

    @Column(nullable = false)
    private Integer period;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private User teacher;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public TimetableEntry(ClassSection classSection, DayOfWeek dayOfWeek, Integer period) {
        this.classSection = classSection;
        this.dayOfWeek = dayOfWeek;
        this.period = period;
    }
}
