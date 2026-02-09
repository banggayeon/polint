package com.polint.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record LintRequest(
        @NotBlank String rulesetId,
        @NotEmpty List<DocDto> docs
) {}
