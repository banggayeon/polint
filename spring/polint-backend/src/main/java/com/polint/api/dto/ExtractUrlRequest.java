package com.polint.api.dto;

import jakarta.validation.constraints.NotBlank;

public record ExtractUrlRequest(
        @NotBlank String url
) {}
