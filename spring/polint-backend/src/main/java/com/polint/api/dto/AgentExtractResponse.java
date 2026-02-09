package com.polint.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AgentExtractResponse(
        String title,
        String text,
        @JsonProperty("mime_type") String mimeType,
        String source
) {}
