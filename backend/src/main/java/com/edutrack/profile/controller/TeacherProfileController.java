package com.edutrack.profile.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.profile.dto.TeacherProfileResponse;
import com.edutrack.profile.dto.TeacherProfileUpdateRequest;
import com.edutrack.profile.dto.TimetableSlotResponse;
import com.edutrack.profile.dto.TimetableSlotUpsertRequest;
import com.edutrack.profile.service.TeacherProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

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

    @PostMapping(value = "/photo", consumes = "multipart/form-data")
    public ApiResponse<TeacherProfileResponse> uploadPhoto(@RequestParam MultipartFile file) {
        return ApiResponse.ok(teacherProfileService.uploadMyPhoto(file));
    }

    @GetMapping("/photo")
    public ResponseEntity<byte[]> getMyPhoto() {
        return photoResponse(currentTeacherPhotoOwner());
    }

    @GetMapping("/timetable")
    public ApiResponse<List<TimetableSlotResponse>> myTimetable() {
        return ApiResponse.ok(teacherProfileService.listMyTimetable());
    }

    @PostMapping("/timetable")
    public ApiResponse<TimetableSlotResponse> addSlot(@Valid @RequestBody TimetableSlotUpsertRequest request) {
        return ApiResponse.ok(teacherProfileService.addSlot(request.subjectId(), request.dayOfWeek(), request.startTime(), request.endTime()));
    }

    @DeleteMapping("/timetable/{slotId}")
    public ApiResponse<Void> deleteSlot(@PathVariable Long slotId) {
        teacherProfileService.deleteSlot(slotId);
        return ApiResponse.ok(null);
    }

    private Long currentTeacherPhotoOwner() {
        return com.edutrack.security.CurrentUser.get().getUserId();
    }

    private ResponseEntity<byte[]> photoResponse(Long teacherId) {
        byte[] bytes = teacherProfileService.getPhotoBytes(teacherId);
        String contentType = teacherProfileService.getPhotoContentType(teacherId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(contentType)).body(bytes);
    }
}
