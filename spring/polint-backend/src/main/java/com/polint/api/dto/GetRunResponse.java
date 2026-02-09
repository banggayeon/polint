package com.polint.api.dto;

public record GetRunResponse(
        String runId,
        String rulesetId,
        String resultJson
) {}
