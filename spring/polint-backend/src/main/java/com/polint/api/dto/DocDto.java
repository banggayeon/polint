package com.polint.api.dto;

import jakarta.validation.constraints.NotBlank;

public record DocDto(
        @NotBlank String title,
        @NotBlank String content
) {}
