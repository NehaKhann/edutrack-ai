package com.edutrack.org.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.org.dto.SubjectResponse;
import com.edutrack.org.service.SubjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/subjects")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;

    @GetMapping
    public ApiResponse<List<SubjectResponse>> mySubjects() {
        return ApiResponse.ok(subjectService.getMySubjects());
    }
}
