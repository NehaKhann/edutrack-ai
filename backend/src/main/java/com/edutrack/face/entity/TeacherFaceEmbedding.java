package com.edutrack.face.entity;

import com.edutrack.org.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Stores one teacher's reference face embedding (a 128-dimensional descriptor produced by
 * face-api.js's faceRecognitionNet, client-side). Ongoing attendance verification stays
 * descriptor-only, same as before. Enrollment itself now also captures a real photo (see
 * {@link #photoRef}) purely so the Principal has something to visually review before an
 * enrollment becomes usable — a new gate this class didn't previously have.
 */
@Entity
@Table(name = "teacher_face_embedding")
@Getter
@Setter
@NoArgsConstructor
public class TeacherFaceEmbedding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false, unique = true)
    private User teacher;

    /** JSON array of 128 floats, e.g. "[0.0123,-0.0456,...]". Compared in application code, not SQL. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String embedding;

    /** Consecutive failed verification attempts, used to apply a short cooldown against brute-forcing a match. */
    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private FaceEnrollmentStatus status = FaceEnrollmentStatus.PENDING;

    /** Storage ref for the photo captured at enrollment time, shown only to the Principal for review. Null for rows grandfathered in before this feature existed. */
    @Column(name = "photo_ref", length = 500)
    private String photoRef;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private User reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public TeacherFaceEmbedding(User teacher, String embedding) {
        this.teacher = teacher;
        this.embedding = embedding;
    }
}
