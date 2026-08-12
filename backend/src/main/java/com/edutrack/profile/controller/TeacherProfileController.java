package com.edutrack.profile.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.profile.dto.ChangePasswordRequest;
import com.edutrack.profile.dto.TeacherProfileResponse;
import com.edutrack.profile.dto.TeacherProfileUpdateRequest;
import com.edutrack.profile.service.TeacherProfileService;
import com.edutrack.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/teacher-profiles/me")
@RequiredArgsConstructor
public class TeacherProfileController {

    private final TeacherProfileService teacherProfileService;

    @GetMapping
    public ApiResponse<TeacherProfileResponse> getMyProfile() {
        return ApiResponse.ok(teacherProfileService.getMyProfile());
    }

    @PutMapping
    public ApiResponse<TeacherProfileResponse> updateMyProfile(@RequestBody TeacherProfileUpdateRequest request) {
        return ApiResponse.ok(teacherProfileService.updateMyProfile(request));
    }

    @PutMapping("/password")
    public ApiResponse<Void> changeMyPassword(@Valid @RequestBody ChangePasswordRequest request) {
        teacherProfileService.changeMyPassword(request.currentPassword(), request.newPassword());
        return ApiResponse.ok(null, "Password updated successfully");
    }

    @PostMapping(value = "/photo", consumes = "multipart/form-data")
    public ApiResponse<TeacherProfileResponse> uploadPhoto(@RequestParam MultipartFile file) {
        return ApiResponse.ok(teacherProfileService.uploadMyPhoto(file));
    }

    @GetMapping("/photo")
    public ResponseEntity<byte[]> getMyPhoto() {
        return photoResponse(currentTeacherId());
    }

    @GetMapping("/cv")
    public ResponseEntity<byte[]> getMyCv() {
        return cvResponse(currentTeacherId());
    }

    private Long currentTeacherId() {
        return CurrentUser.get().getUserId();
    }

    private ResponseEntity<byte[]> photoResponse(Long teacherId) {
        byte[] bytes = teacherProfileService.getPhotoBytes(teacherId);
        String contentType = teacherProfileService.getPhotoContentType(teacherId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType)).body(bytes);
    }

    private ResponseEntity<byte[]> cvResponse(Long teacherId) {
        byte[] bytes = teacherProfileService.getCvBytes(teacherId);
        String filename = teacherProfileService.getCvFilename(teacherId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + sanitize(filename) + "\"")
                .body(bytes);
    }

    private String sanitize(String filename) {
        return filename == null ? "cv" : filename.replaceAll("[\\r\\n\"]", "_");
    }
}
