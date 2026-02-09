package com.polint.api.dto;

public record ExtractTextResponse(
        String title,
        String text,
        String sourceType,
        String mimeType
) {}
