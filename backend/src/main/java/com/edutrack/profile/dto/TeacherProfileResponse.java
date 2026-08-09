package com.edutrack.profile.dto;

import com.edutrack.org.dto.SubjectResponse;
import com.edutrack.org.entity.User;
import com.edutrack.profile.entity.TeacherProfile;

import java.util.List;

public record TeacherProfileResponse(
        Long teacherId,
        String name,
        String email,
        String designation,
        String bio,
        boolean hasPhoto,
        List<SubjectResponse> subjects,
        List<TimetableSlotResponse> timetable
) {
    public static TeacherProfileResponse from(User teacher, TeacherProfile profile, List<SubjectResponse> subjects, List<TimetableSlotResponse> timetable) {
        return new TeacherProfileResponse(
                teacher.getId(),
                teacher.getName(),
                teacher.getEmail(),
                profile != null ? profile.getDesignation() : null,
                profile != null ? profile.getBio() : null,
                profile != null && profile.getProfilePhotoRef() != null,
                subjects,
                timetable
        );
    }
}
