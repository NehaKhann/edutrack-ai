package com.edutrack.chat.dto;

import com.edutrack.org.entity.User;

public record ContactResponse(Long id, String name, String email, String role) {
    public static ContactResponse from(User u) {
        return new ContactResponse(u.getId(), u.getName(), u.getEmail(), u.getRole().name());
    }
}
