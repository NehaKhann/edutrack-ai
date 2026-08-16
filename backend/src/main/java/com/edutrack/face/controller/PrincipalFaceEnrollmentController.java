package com.edutrack.face.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.face.dto.PendingFaceEnrollmentResponse;
import com.edutrack.face.dto.RejectEnrollmentRequest;
import com.edutrack.face.service.FaceRecognitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/principal/face-enrollments")
@RequiredArgsConstructor
public class PrincipalFaceEnrollmentController {

    private final FaceRecognitionService faceRecognitionService;

    @GetMapping("/pending")
    public ApiResponse<List<PendingFaceEnrollmentResponse>> pending() {
        return ApiResponse.ok(faceRecognitionService.listPendingEnrollments());
    }

    @GetMapping("/{teacherId}/photo")
    public ResponseEntity<byte[]> photo(@PathVariable Long teacherId) {
        byte[] bytes = faceRecognitionService.getEnrollmentPhotoBytes(teacherId);
        String contentType = faceRecognitionService.getEnrollmentPhotoContentType(teacherId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(bytes);
    }

    @PostMapping("/{teacherId}/approve")
    public ApiResponse<Void> approve(@PathVariable Long teacherId) {
        faceRecognitionService.reviewEnrollment(teacherId, true, null);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{teacherId}/reject")
    public ApiResponse<Void> reject(@PathVariable Long teacherId, @RequestBody(required = false) RejectEnrollmentRequest request) {
        faceRecognitionService.reviewEnrollment(teacherId, false, request != null ? request.reason() : null);
        return ApiResponse.ok(null);
    }
}
