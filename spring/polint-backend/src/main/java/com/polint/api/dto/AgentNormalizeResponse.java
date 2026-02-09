package com.polint.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record AgentNormalizeResponse(
        JsonNode normalized_policy
) {}
