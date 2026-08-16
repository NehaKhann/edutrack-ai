package com.edutrack.face.service;

import com.edutrack.audit.entity.AuditAction;
import com.edutrack.audit.service.AuditLogService;
import com.edutrack.common.ApiException;
import com.edutrack.face.dto.FaceStatusResponse;
import com.edutrack.face.dto.FaceVerifyResponse;
import com.edutrack.face.dto.PendingFaceEnrollmentResponse;
import com.edutrack.face.entity.FaceEnrollmentStatus;
import com.edutrack.face.entity.TeacherFaceEmbedding;
import com.edutrack.face.repository.TeacherFaceEmbeddingRepository;
import com.edutrack.notification.service.NotificationService;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.staffattendance.entity.TeacherAttendanceRecord;
import com.edutrack.staffattendance.service.TeacherAttendanceService;
import com.edutrack.storage.FileStorageService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Client-side face detection + descriptor extraction (face-api.js) feeds this service only the
 * 128-dimensional numeric descriptor — never the camera image itself. Matching is done here via
 * cosine similarity against the teacher's single enrolled reference descriptor.
 *
 * This is a lightweight deterrent against casual buddy-punching, not a high-assurance biometric
 * system: there is no liveness check, so a clear photo of the enrolled teacher held up to the
 * camera could in principle pass. That tradeoff was chosen deliberately to avoid a paid cloud
 * API or a heavy server-side ML service.
 */
@Service
@RequiredArgsConstructor
public class FaceRecognitionService {

    private static final Logger log = LoggerFactory.getLogger(FaceRecognitionService.class);

    private static final int EMBEDDING_DIMENSIONS = 128;
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(5);
    private static final List<String> ALLOWED_PHOTO_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    /**
     * Similarity at/above which two descriptors are treated as the same person. face-api.js
     * descriptors for the same face typically score 0.90+ on cosine similarity; different people
     * are usually well below 0.85. Tunable per deployment/camera quality without a redeploy.
     */
    @Value("${face-recognition.similarity-threshold:0.90}")
    private double similarityThreshold;

    private final TeacherFaceEmbeddingRepository embeddingRepository;
    private final UserRepository userRepository;
    private final TeacherAttendanceService teacherAttendanceService;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public FaceStatusResponse getMyStatus() {
        Long teacherId = CurrentUser.get().getUserId();
        return embeddingRepository.findByTeacherId(teacherId)
                .map(e -> new FaceStatusResponse(true, e.getCreatedAt(), e.getStatus().name(), e.getRejectionReason()))
                .orElseGet(() -> new FaceStatusResponse(false, null, null, null));
    }

    /**
     * (Re-)enrolls the current teacher's reference face. Always self-service — never accepts a target
     * teacherId. Now also requires a photo captured at the same moment as the descriptor, purely so the
     * Principal has something to visually review before the enrollment becomes usable — ongoing
     * attendance verification stays descriptor-only, unaffected by this. The new submission always
     * starts PENDING, even on re-enrollment after a rejection.
     */
    @Transactional
    public void enroll(double[] embedding, MultipartFile photo) {
        validate(embedding);
        if (photo == null || photo.isEmpty() || photo.getContentType() == null || !ALLOWED_PHOTO_TYPES.contains(photo.getContentType())) {
            throw ApiException.badRequest("A JPG, PNG, or WebP photo captured from your camera is required to enroll.");
        }
        AuthenticatedUser me = CurrentUser.get();
        Long teacherId = me.getUserId();
        String json = serialize(embedding);

        TeacherFaceEmbedding record = embeddingRepository.findByTeacherId(teacherId)
                .orElseGet(() -> new TeacherFaceEmbedding(userRepository.findById(teacherId).orElseThrow(), json));
        String oldPhotoRef = record.getPhotoRef();
        record.setEmbedding(json);
        record.setFailedAttempts(0);
        record.setLockedUntil(null);
        record.setPhotoRef(fileStorageService.store(photo, "face-enrollment"));
        record.setStatus(FaceEnrollmentStatus.PENDING);
        record.setReviewedBy(null);
        record.setReviewedAt(null);
        record.setRejectionReason(null);
        record.setUpdatedAt(Instant.now());
        embeddingRepository.save(record);
        if (oldPhotoRef != null) {
            fileStorageService.delete(oldPhotoRef);
        }

        User teacher = userRepository.findById(teacherId).orElseThrow();
        for (User principal : userRepository.findBySchoolIdAndRoleAndActive(me.getSchoolId(), Role.PRINCIPAL, true)) {
            notificationService.notify(principal, teacher.getName() + " submitted a face enrollment for review.", "/principal/teacher-directory");
        }
    }

    /** Verifies the current teacher's live scan against their enrolled reference; marks Present on a match. */
    @Transactional
    public FaceVerifyResponse verify(double[] candidate) {
        validate(candidate);
        Long teacherId = CurrentUser.get().getUserId();

        TeacherFaceEmbedding record = embeddingRepository.findByTeacherId(teacherId)
                .orElseThrow(() -> ApiException.badRequest(
                        "You haven't enrolled your face yet. Enroll first, then scan to mark attendance."));

        if (record.getStatus() == FaceEnrollmentStatus.PENDING) {
            throw ApiException.badRequest("Your face enrollment is still awaiting your Principal's approval.");
        }
        if (record.getStatus() == FaceEnrollmentStatus.REJECTED) {
            String reason = record.getRejectionReason();
            throw ApiException.badRequest("Your last face enrollment was rejected"
                    + (reason != null && !reason.isBlank() ? " (" + reason + ")" : "") + " — please re-enroll.");
        }

        if (record.getLockedUntil() != null && record.getLockedUntil().isAfter(Instant.now())) {
            long minutesLeft = Math.max(1, Duration.between(Instant.now(), record.getLockedUntil()).toMinutes() + 1);
            throw ApiException.tooManyRequests(
                    "Too many failed attempts. Try again in " + minutesLeft + " minute(s), or mark manually.");
        }

        double[] reference = deserialize(record.getEmbedding());
        double similarity = cosineSimilarity(reference, candidate);
        boolean matched = similarity >= similarityThreshold;

        if (matched) {
            record.setFailedAttempts(0);
            record.setLockedUntil(null);
            embeddingRepository.save(record);
            TeacherAttendanceRecord attendance = teacherAttendanceService.markPresentViaFaceRecognition(teacherId);
            return new FaceVerifyResponse(true, round(similarity), attendance.getStatus().name(), attendance.getMarkedAt());
        }

        record.setFailedAttempts(record.getFailedAttempts() + 1);
        if (record.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            record.setLockedUntil(Instant.now().plus(LOCKOUT_DURATION));
            record.setFailedAttempts(0);
            log.warn("Face verification locked out for teacher {} after {} failed attempts", teacherId, MAX_FAILED_ATTEMPTS);
        }
        embeddingRepository.save(record);
        return new FaceVerifyResponse(false, round(similarity), null, null);
    }

    @Transactional(readOnly = true)
    public List<PendingFaceEnrollmentResponse> listPendingEnrollments() {
        Long schoolId = CurrentUser.get().getSchoolId();
        return embeddingRepository.findByTeacher_School_IdAndStatusOrderByUpdatedAtAsc(schoolId, FaceEnrollmentStatus.PENDING).stream()
                .map(PendingFaceEnrollmentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public byte[] getEnrollmentPhotoBytes(Long teacherId) {
        TeacherFaceEmbedding record = getOwnedEnrollment(teacherId);
        if (record.getPhotoRef() == null) {
            throw ApiException.notFound("No enrollment photo on file");
        }
        return fileStorageService.load(record.getPhotoRef());
    }

    /** Best-effort content type derived from the stored file's extension — same approach as {@code TeacherProfileService.getPhotoContentType}. */
    @Transactional(readOnly = true)
    public String getEnrollmentPhotoContentType(Long teacherId) {
        TeacherFaceEmbedding record = getOwnedEnrollment(teacherId);
        String ref = record.getPhotoRef();
        if (ref == null) throw ApiException.notFound("No enrollment photo on file");
        String lower = ref.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }

    /** Principal-only. Approving makes the enrollment usable for attendance verification; rejecting requires the teacher to re-enroll. */
    @Transactional
    public void reviewEnrollment(Long teacherId, boolean approve, String reason) {
        TeacherFaceEmbedding record = getOwnedEnrollment(teacherId);
        if (record.getStatus() != FaceEnrollmentStatus.PENDING) {
            throw ApiException.conflict("This enrollment has already been reviewed");
        }
        User reviewer = userRepository.findById(CurrentUser.get().getUserId()).orElseThrow();
        record.setStatus(approve ? FaceEnrollmentStatus.APPROVED : FaceEnrollmentStatus.REJECTED);
        record.setReviewedBy(reviewer);
        record.setReviewedAt(Instant.now());
        record.setRejectionReason(approve ? null : reason);
        embeddingRepository.save(record);

        String message = approve
                ? "Your face enrollment was approved — you can now scan your face to mark attendance."
                : "Your face enrollment was rejected" + (reason != null && !reason.isBlank() ? " (" + reason + ")" : "") + " — please re-enroll.";
        notificationService.notify(record.getTeacher(), message, "/teacher/my-attendance");

        auditLogService.record(
                approve ? AuditAction.FACE_ENROLLMENT_APPROVED : AuditAction.FACE_ENROLLMENT_REJECTED,
                "TEACHER", teacherId, record.getTeacher().getName(),
                approve ? "Face enrollment approved" : "Face enrollment rejected" + (reason != null && !reason.isBlank() ? " (" + reason + ")" : "")
        );
    }

    private TeacherFaceEmbedding getOwnedEnrollment(Long teacherId) {
        TeacherFaceEmbedding record = embeddingRepository.findByTeacherId(teacherId)
                .orElseThrow(() -> ApiException.notFound("No face enrollment found for this teacher"));
        if (!record.getTeacher().getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("No face enrollment found for this teacher");
        }
        return record;
    }

    /** Standard cosine similarity: dot(a,b) / (||a|| * ||b||), in [-1, 1] for arbitrary vectors. */
    double cosineSimilarity(double[] a, double[] b) {
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0 || normB == 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private void validate(double[] embedding) {
        if (embedding == null || embedding.length != EMBEDDING_DIMENSIONS) {
            throw ApiException.badRequest("Invalid face descriptor — expected " + EMBEDDING_DIMENSIONS + " dimensions.");
        }
        for (double v : embedding) {
            if (Double.isNaN(v) || Double.isInfinite(v)) {
                throw ApiException.badRequest("Invalid face descriptor.");
            }
        }
    }

    private String serialize(double[] embedding) {
        try {
            return objectMapper.writeValueAsString(embedding);
        } catch (JsonProcessingException e) {
            throw ApiException.internal("Could not process face data", e);
        }
    }

    private double[] deserialize(String json) {
        try {
            return objectMapper.readValue(json, double[].class);
        } catch (JsonProcessingException e) {
            throw ApiException.internal("Could not read stored face data", e);
        }
    }

    private double round(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }
}
