package com.edutrack.org.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.org.dto.ClassSectionSummaryResponse;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ClassSectionController {

    private final ClassSectionRepository classSectionRepository;

    @GetMapping("/api/principal/class-sections")
    public ApiResponse<List<ClassSectionSummaryResponse>> list() {
        Long schoolId = CurrentUser.get().getSchoolId();
        List<ClassSectionSummaryResponse> sections = classSectionRepository.findBySchoolId(schoolId).stream()
                .sorted(Comparator.comparing(cs -> cs.getName()))
                .map(ClassSectionSummaryResponse::from)
                .toList();
        return ApiResponse.ok(sections);
    }
}
