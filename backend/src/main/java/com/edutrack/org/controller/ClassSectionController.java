package com.edutrack.org.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.org.dto.ClassSectionSummaryResponse;
import com.edutrack.org.dto.CreateClassRequest;
import com.edutrack.org.dto.CreateSectionRequest;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.org.service.ClassSectionService;
import com.edutrack.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ClassSectionController {

    private final ClassSectionRepository classSectionRepository;
    private final ClassSectionService classSectionService;

    @GetMapping("/api/principal/class-sections")
    public ApiResponse<List<ClassSectionSummaryResponse>> list() {
        Long schoolId = CurrentUser.get().getSchoolId();
        List<ClassSectionSummaryResponse> sections = classSectionRepository.findBySchoolId(schoolId).stream()
                .sorted(Comparator.comparing(cs -> cs.getName()))
                .map(ClassSectionSummaryResponse::from)
                .toList();
        return ApiResponse.ok(sections);
    }

    @PostMapping("/api/principal/classes")
    public ApiResponse<ClassSectionSummaryResponse> createClass(@Valid @RequestBody CreateClassRequest request) {
        return ApiResponse.ok(classSectionService.createClass(request.className()));
    }

    @PostMapping("/api/principal/classes/sections")
    public ApiResponse<ClassSectionSummaryResponse> addSection(@Valid @RequestBody CreateSectionRequest request) {
        return ApiResponse.ok(classSectionService.addSection(request.className(), request.sectionName()));
    }
}
