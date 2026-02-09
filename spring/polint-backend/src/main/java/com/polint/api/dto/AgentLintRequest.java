package com.polint.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

public record AgentLintRequest(
        JsonNode ruleset,
        List<AgentDocDto> docs
) {}
