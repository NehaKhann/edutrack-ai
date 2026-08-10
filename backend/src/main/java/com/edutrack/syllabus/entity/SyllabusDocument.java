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

    /** Null for manual-entry documents that have no underlying uploaded file. */
    @Column(name = "file_ref")
    private String fileRef;

    @Column(name = "extracted_text", nullable = false, columnDefinition = "TEXT")
    private String extractedText;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    /** The uploaded file's MIME type — drives preview rendering. Null for manual-entry documents. */
    @Column(name = "content_type")
    private String contentType;

    /** Average Tesseract word confidence (0-100). Null when the document wasn't OCR'd (text-layer PDF, DOCX, manual entry). */
    @Column(name = "ocr_confidence")
    private Double ocrConfidence;

    /** Tesseract language(s) actually used, e.g. "eng" or "eng+urd". Null when OCR wasn't used. */
    @Column(name = "ocr_language")
    private String ocrLanguage;

    /** Comma-joined list of words Tesseract was least confident about — a reference list for the reviewer, not exhaustive. */
    @Column(name = "low_confidence_words", columnDefinition = "TEXT")
    private String lowConfidenceWords;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public SyllabusDocument(Syllabus syllabus, String originalFilename, String fileRef, String extractedText, int orderIndex) {
        this(syllabus, originalFilename, fileRef, extractedText, orderIndex, null, null, null, null);
    }

    public SyllabusDocument(Syllabus syllabus, String originalFilename, String fileRef, String extractedText, int orderIndex,
                             String contentType, Double ocrConfidence, String ocrLanguage, String lowConfidenceWords) {
        this.syllabus = syllabus;
        this.originalFilename = originalFilename;
        this.fileRef = fileRef;
        this.extractedText = extractedText;
        this.orderIndex = orderIndex;
        this.contentType = contentType;
        this.ocrConfidence = ocrConfidence;
        this.ocrLanguage = ocrLanguage;
        this.lowConfidenceWords = lowConfidenceWords;
    }
}
