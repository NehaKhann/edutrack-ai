package com.edutrack.org.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.org.dto.StudentResponse;
import com.edutrack.org.dto.StudentUpsertRequest;
import com.edutrack.org.service.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;

    @GetMapping("/api/class-sections/{classSectionId}/students")
    public ApiResponse<List<StudentResponse>> list(@PathVariable Long classSectionId) {
        return ApiResponse.ok(studentService.listForClassSection(classSectionId));
    }

    @PostMapping("/api/class-sections/{classSectionId}/students")
    public ApiResponse<StudentResponse> create(@PathVariable Long classSectionId, @Valid @RequestBody StudentUpsertRequest request) {
        return ApiResponse.ok(studentService.create(classSectionId, request));
    }

    @PutMapping("/api/students/{studentId}")
    public ApiResponse<StudentResponse> update(@PathVariable Long studentId, @Valid @RequestBody StudentUpsertRequest request) {
        return ApiResponse.ok(studentService.update(studentId, request));
    }

    @DeleteMapping("/api/students/{studentId}")
    public ApiResponse<Void> deactivate(@PathVariable Long studentId) {
        studentService.deactivate(studentId);
        return ApiResponse.ok(null);
    }
}
