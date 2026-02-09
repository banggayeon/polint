package com.polint.api.dto;

import java.util.List;

public record AgentBuildRequest(
        String policyId,
        String regulationText,
        List<AgentDocDto> knowledgeDocs
) {}
