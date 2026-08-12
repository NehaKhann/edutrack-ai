package com.edutrack.profile.dto;

import com.edutrack.org.dto.SubjectResponse;
import com.edutrack.org.entity.User;
import com.edutrack.profile.entity.TeacherProfile;

import java.util.List;

public record TeacherProfileResponse(
        Long teacherId,
        String name,
        String email,
        String phone,
        String designation,
        String bio,
        boolean hasPhoto,
        boolean hasCv,
        String cvFilename,
        boolean mustChangePassword,
        List<SubjectResponse> subjects
) {
    public static TeacherProfileResponse from(User teacher, TeacherProfile profile, List<SubjectResponse> subjects) {
        return new TeacherProfileResponse(
                teacher.getId(),
                teacher.getName(),
                teacher.getEmail(),
                profile != null ? profile.getPhone() : null,
                profile != null ? profile.getDesignation() : null,
                profile != null ? profile.getBio() : null,
                profile != null && profile.getProfilePhotoRef() != null,
                profile != null && profile.getCvFileRef() != null,
                profile != null ? profile.getCvFilename() : null,
                teacher.getTempPassword() != null,
                subjects
        );
    }
}
