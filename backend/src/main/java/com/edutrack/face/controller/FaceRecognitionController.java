package com.edutrack.face.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.face.dto.EmbeddingRequest;
import com.edutrack.face.dto.FaceStatusResponse;
import com.edutrack.face.dto.FaceVerifyResponse;
import com.edutrack.face.service.FaceRecognitionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * All three endpoints act on the CURRENT authenticated teacher only — none accept a target
 * teacherId from the client, so a teacher can never enroll or verify on behalf of someone else.
 */
@RestController
@RequiredArgsConstructor
public class FaceRecognitionController {

    private final FaceRecognitionService faceRecognitionService;

    @GetMapping("/api/face/status")
    public ApiResponse<FaceStatusResponse> status() {
        return ApiResponse.ok(faceRecognitionService.getMyStatus());
    }

    @PostMapping("/api/face/enroll")
    public ApiResponse<Void> enroll(@Valid @RequestBody EmbeddingRequest request) {
        faceRecognitionService.enroll(request.embedding());
        return ApiResponse.ok(null);
    }

    @PostMapping("/api/face/verify")
    public ApiResponse<FaceVerifyResponse> verify(@Valid @RequestBody EmbeddingRequest request) {
        return ApiResponse.ok(faceRecognitionService.verify(request.embedding()));
    }
}
