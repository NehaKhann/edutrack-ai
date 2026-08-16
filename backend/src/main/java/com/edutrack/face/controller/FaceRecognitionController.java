package com.edutrack.face.controller;

import com.edutrack.common.ApiException;
import com.edutrack.common.ApiResponse;
import com.edutrack.face.dto.EmbeddingRequest;
import com.edutrack.face.dto.FaceStatusResponse;
import com.edutrack.face.dto.FaceVerifyResponse;
import com.edutrack.face.service.FaceRecognitionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * All three endpoints act on the CURRENT authenticated teacher only — none accept a target
 * teacherId from the client, so a teacher can never enroll or verify on behalf of someone else.
 */
@RestController
@RequiredArgsConstructor
public class FaceRecognitionController {

    private final FaceRecognitionService faceRecognitionService;
    private final ObjectMapper objectMapper;

    @GetMapping("/api/face/status")
    public ApiResponse<FaceStatusResponse> status() {
        return ApiResponse.ok(faceRecognitionService.getMyStatus());
    }

    /** Multipart, not JSON, because enrollment now also captures a photo for the Principal to review. */
    @PostMapping(value = "/api/face/enroll", consumes = "multipart/form-data")
    public ApiResponse<Void> enroll(@RequestParam String embedding, @RequestParam MultipartFile photo) {
        faceRecognitionService.enroll(parseEmbedding(embedding), photo);
        return ApiResponse.ok(null);
    }

    @PostMapping("/api/face/verify")
    public ApiResponse<FaceVerifyResponse> verify(@Valid @RequestBody EmbeddingRequest request) {
        return ApiResponse.ok(faceRecognitionService.verify(request.embedding()));
    }

    private double[] parseEmbedding(String json) {
        try {
            return objectMapper.readValue(json, double[].class);
        } catch (Exception e) {
            throw ApiException.badRequest("Invalid face descriptor.");
        }
    }
}
