package com.polint.infra.agent;

import com.polint.api.dto.AgentBuildRequest;
import com.polint.api.dto.AgentBuildResponse;
import com.polint.api.dto.AgentLintRequest;
import com.polint.api.dto.AgentLintResponse;
import com.polint.api.dto.AgentExtractUrlRequest;
import com.polint.api.dto.AgentExtractResponse;

import com.polint.api.dto.AgentNormalizeRequest;
import com.polint.api.dto.AgentNormalizeResponse;

public interface AgentClient {
    AgentBuildResponse build(AgentBuildRequest req);
    AgentLintResponse lint(AgentLintRequest req);
    AgentNormalizeResponse normalize(AgentNormalizeRequest req);
    AgentExtractResponse extractFile(String filename, byte[] bytes, String contentType);
    AgentExtractResponse extractUrl(AgentExtractUrlRequest req);
}
