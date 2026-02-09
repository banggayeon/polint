package com.polint.api.dto;

import jakarta.validation.constraints.NotBlank;

public record AgentDocDto(
        @NotBlank String id,
        @NotBlank String content
) {}
