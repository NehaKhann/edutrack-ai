package com.edutrack.org.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "school")
@Getter
@Setter
@NoArgsConstructor
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "school_weekend_day", joinColumns = @JoinColumn(name = "school_id"))
    @Column(name = "day_of_week", nullable = false)
    @Enumerated(EnumType.STRING)
    private Set<DayOfWeek> weekendDays = new HashSet<>();

    /** Self-marking after this time on a given day is recorded as Late instead of Present. */
    @Column(name = "attendance_cutoff_time", nullable = false)
    private LocalTime attendanceCutoffTime = LocalTime.of(9, 0);

    /** A teacher with no attendance record at all by this time is automatically marked Absent. */
    @Column(name = "attendance_auto_absent_time", nullable = false)
    private LocalTime attendanceAutoAbsentTime = LocalTime.of(11, 0);

    public School(String name) {
        this.name = name;
    }
}
