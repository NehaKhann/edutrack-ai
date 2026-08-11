package com.edutrack.diary.entity;

import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "diary_entry")
@Getter
@Setter
@NoArgsConstructor
public class DiaryEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "page_number")
    private String pageNumber;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "attachment_file_ref")
    private String attachmentFileRef;

    @Column(name = "attachment_filename")
    private String attachmentFilename;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DiaryEntryStatus status = DiaryEntryStatus.SUBMITTED;

    public DiaryEntry(Subject subject, User teacher, LocalDate entryDate, String content) {
        this.subject = subject;
        this.teacher = teacher;
        this.entryDate = entryDate;
        this.content = content;
    }
}
