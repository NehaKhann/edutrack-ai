package com.edutrack.profile.dto;

import com.edutrack.org.entity.User;
import com.edutrack.profile.entity.TeacherProfile;

public record TeacherAccountResponse(
        Long teacherId,
        String name,
        String email,
        String phone,
        String tempPassword,
        boolean passwordChanged,
        boolean hasCv,
        String cvFilename
) {
    public static TeacherAccountResponse from(User user, TeacherProfile profile) {
        return new TeacherAccountResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                profile != null ? profile.getPhone() : null,
                user.getTempPassword(),
                user.getTempPassword() == null,
                profile != null && profile.getCvFileRef() != null,
                profile != null ? profile.getCvFilename() : null
        );
    }
}
