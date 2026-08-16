package com.edutrack.profile.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.profile.dto.TeacherAccountResponse;
import com.edutrack.profile.dto.TeacherDirectoryEntry;
import com.edutrack.profile.dto.TeacherImportResultResponse;
import com.edutrack.profile.dto.TeacherProfileResponse;
import com.edutrack.profile.service.TeacherImportService;
import com.edutrack.profile.service.TeacherProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/principal/teacher-profiles")
@RequiredArgsConstructor
public class PrincipalTeacherDirectoryController {

    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final TeacherProfileService teacherProfileService;
    private final TeacherImportService teacherImportService;

    @GetMapping
    public ApiResponse<List<TeacherDirectoryEntry>> directory() {
        return ApiResponse.ok(teacherProfileService.listDirectory());
    }

    @GetMapping("/inactive")
    public ApiResponse<List<TeacherDirectoryEntry>> inactiveDirectory() {
        return ApiResponse.ok(teacherProfileService.listInactiveDirectory());
    }

    @GetMapping("/accounts")
    public ApiResponse<List<TeacherAccountResponse>> accounts() {
        return ApiResponse.ok(teacherProfileService.listAccounts());
    }

    @PostMapping(value = "/accounts", consumes = "multipart/form-data")
    public ApiResponse<TeacherAccountResponse> createAccount(
            @RequestParam String name,
            @RequestParam String email,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) MultipartFile cv) {
        return ApiResponse.ok(teacherProfileService.createTeacherAccount(name, email, phone, cv), "Teacher account created");
    }

    @GetMapping("/import/template")
    public ResponseEntity<byte[]> importTemplate() {
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=teacher-import-template.xlsx")
                .body(teacherImportService.downloadTemplate());
    }

    @PostMapping(value = "/import", consumes = "multipart/form-data")
    public ApiResponse<TeacherImportResultResponse> importTeachers(@RequestParam MultipartFile file) {
        return ApiResponse.ok(teacherImportService.importXlsx(file));
    }

    @GetMapping("/{teacherId}")
    public ApiResponse<TeacherProfileResponse> detail(@PathVariable Long teacherId) {
        return ApiResponse.ok(teacherProfileService.getProfileFor(teacherId));
    }

    @GetMapping("/{teacherId}/photo")
    public ResponseEntity<byte[]> photo(@PathVariable Long teacherId) {
        byte[] bytes = teacherProfileService.getPhotoBytes(teacherId);
        String contentType = teacherProfileService.getPhotoContentType(teacherId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType)).body(bytes);
    }

    @GetMapping("/{teacherId}/cv")
    public ResponseEntity<byte[]> cv(@PathVariable Long teacherId) {
        byte[] bytes = teacherProfileService.getCvBytes(teacherId);
        String filename = teacherProfileService.getCvFilename(teacherId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + sanitize(filename) + "\"")
                .body(bytes);
    }

    @PostMapping("/{teacherId}/reset-password")
    public ApiResponse<TeacherAccountResponse> resetPassword(@PathVariable Long teacherId) {
        return ApiResponse.ok(teacherProfileService.resetPassword(teacherId), "Password reset");
    }

    @PostMapping("/{teacherId}/deactivate")
    public ApiResponse<Void> deactivate(@PathVariable Long teacherId) {
        teacherProfileService.deactivateTeacher(teacherId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{teacherId}/reactivate")
    public ApiResponse<Void> reactivate(@PathVariable Long teacherId) {
        teacherProfileService.reactivateTeacher(teacherId);
        return ApiResponse.ok(null);
    }

    private String sanitize(String filename) {
        return filename == null ? "cv" : filename.replaceAll("[\\r\\n\"]", "_");
    }
}
