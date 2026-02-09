package com.polint.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record AgentBuildResponse(
        JsonNode normalized_policy,
        JsonNode ruleset,
        JsonNode testsuite,
        JsonNode verification_report
) {}
