package com.edutrack.security.dto;

public record LoginResponse(String token, UserSummary user) {
    public record UserSummary(Long id, String name, String email, String role, Long schoolId, boolean mustChangePassword) {
    }
}
