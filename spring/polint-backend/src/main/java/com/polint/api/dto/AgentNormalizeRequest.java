package com.polint.api.dto;

import java.util.List;

public record AgentNormalizeRequest(
        String policyId,
        String regulationText,
        List<AgentDocDto> knowledgeDocs
) {}
