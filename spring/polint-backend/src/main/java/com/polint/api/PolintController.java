package com.polint.api;

import com.polint.application.PolicyService;
import com.polint.api.dto.*;
import com.polint.common.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/v1")
public class PolintController {

    private final PolicyService policyService;

    @PostMapping("/policies")
    public ApiResponse<CreatePolicyResponse> createPolicy(@RequestBody @Valid CreatePolicyRequest req) {
        return ApiResponse.ok(policyService.createPolicy(req));
    }

    @PostMapping("/policies/{policyId}/build")
    public ApiResponse<BuildPolicyResponse> buildPolicy(@PathVariable String policyId,
                                                        @RequestBody(required = false) BuildPolicyRequest req) {
        return ApiResponse.ok(policyService.buildPolicy(policyId, req));
    }

    @PostMapping("/lint")
    public ApiResponse<LintResponse> lint(@RequestBody @Valid LintRequest req) {
        return ApiResponse.ok(policyService.lint(req));
    }

    @GetMapping("/runs/{runId}")
    public ApiResponse<GetRunResponse> getRun(@PathVariable String runId) {
        return ApiResponse.ok(policyService.getRun(runId));
    }

    @GetMapping("/health")
    public ApiResponse<String> health() {
        return ApiResponse.ok("ok");
    }
    
    @PostMapping("/policies/{policyId}/normalize")
    public ApiResponse<NormalizePolicyResponse> normalizePolicy(
            @PathVariable String policyId,
            @RequestBody(required = false) NormalizePolicyRequest req
    ) {
        return ApiResponse.ok(policyService.normalizePolicy(policyId, req));
    }

}
