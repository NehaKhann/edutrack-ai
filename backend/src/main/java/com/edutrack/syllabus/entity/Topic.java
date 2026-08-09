package com.edutrack.syllabus.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "topic")
@Getter
@Setter
@NoArgsConstructor
public class Topic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "syllabus_id", nullable = false)
    private Syllabus syllabus;

    @Column(nullable = false)
    private String title;

    @Column(name = "start_week")
    private Integer startWeek;

    @Column(name = "end_week")
    private Integer endWeek;

    @Column(name = "planned_start_date", nullable = false)
    private LocalDate plannedStartDate;

    @Column(name = "planned_end_date", nullable = false)
    private LocalDate plannedEndDate;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex = 0;

    @Column(nullable = false)
    private boolean covered = false;

    @Column(name = "covered_date")
    private LocalDate coveredDate;

    public Topic(Syllabus syllabus, String title, Integer startWeek, Integer endWeek,
                 LocalDate plannedStartDate, LocalDate plannedEndDate, Integer orderIndex) {
        this.syllabus = syllabus;
        this.title = title;
        this.startWeek = startWeek;
        this.endWeek = endWeek;
        this.plannedStartDate = plannedStartDate;
        this.plannedEndDate = plannedEndDate;
        this.orderIndex = orderIndex;
    }
}
