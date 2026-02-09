package com.polint.api.dto;

import java.util.List;

public record NormalizePolicyRequest(
        List<DocDto> knowledgeDocs
) {}
