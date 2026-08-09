package com.edutrack.syllabus.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "syllabus_document")
@Getter
@Setter
@NoArgsConstructor
public class SyllabusDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "syllabus_id", nullable = false)
    private Syllabus syllabus;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "file_ref", nullable = false)
    private String fileRef;

    @Column(name = "extracted_text", nullable = false, columnDefinition = "TEXT")
    private String extractedText;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public SyllabusDocument(Syllabus syllabus, String originalFilename, String fileRef, String extractedText, int orderIndex) {
        this.syllabus = syllabus;
        this.originalFilename = originalFilename;
        this.fileRef = fileRef;
        this.extractedText = extractedText;
        this.orderIndex = orderIndex;
    }
}
