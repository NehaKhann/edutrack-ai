package com.edutrack.syllabus.entity;

import com.edutrack.org.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "lesson_plan_entry")
@Getter
@Setter
@NoArgsConstructor
public class LessonPlanEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id", nullable = false)
    private Topic topic;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(name = "planned_date", nullable = false)
    private LocalDate plannedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LessonPlanStatus status = LessonPlanStatus.PLANNED;

    private String reason;

    @Column(name = "actual_date")
    private LocalDate actualDate;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public LessonPlanEntry(Topic topic, User teacher, LocalDate plannedDate) {
        this.topic = topic;
        this.teacher = teacher;
        this.plannedDate = plannedDate;
    }
}
