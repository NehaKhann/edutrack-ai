package com.edutrack.chat.dto;

import jakarta.validation.constraints.NotNull;

public record StartDirectRequest(@NotNull Long userId) {
}
