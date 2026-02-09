package com.polint.api.dto;

import java.util.List;

public record BuildPolicyRequest(
        List<DocDto> knowledgeDocs
) {}
