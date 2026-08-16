package com.edutrack.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateGroupRequest(
        @NotBlank String name,
        @NotEmpty List<Long> participantIds
) {
}
