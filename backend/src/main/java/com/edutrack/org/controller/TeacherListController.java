package com.edutrack.org.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.org.dto.TeacherSummaryResponse;
import com.edutrack.org.entity.Role;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class TeacherListController {

    private final UserRepository userRepository;

    @GetMapping("/api/teachers")
    public ApiResponse<List<TeacherSummaryResponse>> list() {
        Long schoolId = CurrentUser.get().getSchoolId();
        List<TeacherSummaryResponse> teachers = userRepository.findBySchoolIdAndRoleAndActive(schoolId, Role.TEACHER, true).stream()
                .sorted(Comparator.comparing(u -> u.getName()))
                .map(TeacherSummaryResponse::from)
                .toList();
        return ApiResponse.ok(teachers);
    }
}
