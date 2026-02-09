package com.polint.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record NormalizePolicyResponse(
        String policyId,
        JsonNode normalizedPolicy
) {}
