package com.edutrack.syllabus.entity;

import com.edutrack.org.entity.Subject;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "syllabus")
@Getter
@Setter
@NoArgsConstructor
public class Syllabus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Column(nullable = false)
    private String term;

    @Column(name = "term_start_date", nullable = false)
    private LocalDate termStartDate;

    @Column(name = "uploaded_file_ref")
    private String uploadedFileRef;

    @Column(name = "raw_extracted_text", columnDefinition = "TEXT")
    private String rawExtractedText;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Syllabus(Subject subject, String term, LocalDate termStartDate, String uploadedFileRef) {
        this.subject = subject;
        this.term = term;
        this.termStartDate = termStartDate;
        this.uploadedFileRef = uploadedFileRef;
    }
}
