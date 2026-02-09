package com.polint.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record AgentLintResponse(
        JsonNode per_doc
) {}
