package com.polint.api.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record BuildPolicyResponse(
        String policyId,
        String rulesetId,

        // Step3/Step4에서 실제 결과를 렌더링하기 위한 필드들
        JsonNode normalizedPolicy,
        JsonNode ruleset,
        JsonNode testsuite,
        JsonNode verificationReport
) {}
