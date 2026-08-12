package com.edutrack.org.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.org.dto.CreateSubjectRequest;
import com.edutrack.org.dto.SubjectResponse;
import com.edutrack.org.dto.UpdateSubjectRequest;
import com.edutrack.org.service.SubjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;

    @GetMapping("/api/subjects")
    public ApiResponse<List<SubjectResponse>> mySubjects() {
        return ApiResponse.ok(subjectService.getMySubjects());
    }

    @GetMapping("/api/principal/subjects")
    public ApiResponse<List<SubjectResponse>> listSubjects(@RequestParam(required = false) Long classSectionId) {
        return ApiResponse.ok(subjectService.listSubjects(classSectionId));
    }

    @PostMapping("/api/principal/subjects")
    public ApiResponse<SubjectResponse> createSubject(@Valid @RequestBody CreateSubjectRequest request) {
        return ApiResponse.ok(subjectService.createSubject(request.classSectionId(), request.name(), request.teacherId()));
    }

    @PutMapping("/api/principal/subjects/{subjectId}")
    public ApiResponse<SubjectResponse> updateSubject(@PathVariable Long subjectId, @Valid @RequestBody UpdateSubjectRequest request) {
        return ApiResponse.ok(subjectService.updateSubject(subjectId, request.name(), request.teacherId()));
    }
}
