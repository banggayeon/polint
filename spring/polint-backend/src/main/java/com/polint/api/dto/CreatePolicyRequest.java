package com.polint.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CreatePolicyRequest(
        String policyId,
        String version,
        @NotBlank String regulationText
) {}
