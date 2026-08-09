package com.edutrack.profile.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.profile.dto.TeacherDirectoryEntry;
import com.edutrack.profile.dto.TeacherProfileResponse;
import com.edutrack.profile.dto.TimetableSlotResponse;
import com.edutrack.profile.service.TeacherProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/principal/teacher-profiles")
@RequiredArgsConstructor
public class PrincipalTeacherDirectoryController {

    private final TeacherProfileService teacherProfileService;

    @GetMapping
    public ApiResponse<List<TeacherDirectoryEntry>> directory() {
        return ApiResponse.ok(teacherProfileService.listDirectory());
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

    @GetMapping("/{teacherId}/timetable")
    public ApiResponse<List<TimetableSlotResponse>> timetable(@PathVariable Long teacherId) {
        return ApiResponse.ok(teacherProfileService.listTimetableFor(teacherId));
    }
}
