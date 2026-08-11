package com.edutrack.org.dto;

import com.edutrack.org.entity.User;

public record TeacherSummaryResponse(
        Long id,
        String name
) {
    public static TeacherSummaryResponse from(User u) {
        return new TeacherSummaryResponse(u.getId(), u.getName());
    }
}
