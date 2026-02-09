package com.polint.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.polint.api.dto.*;
import com.polint.common.exception.ApiException;
import com.polint.common.exception.ErrorCode;
import com.polint.infra.agent.AgentClient;
import com.polint.infra.persistence.entity.LintRunEntity;
import com.polint.infra.persistence.entity.PolicyEntity;
import com.polint.infra.persistence.entity.RuleSetEntity;
import com.polint.infra.persistence.repo.LintRunRepository;
import com.polint.infra.persistence.repo.PolicyRepository;
import com.polint.infra.persistence.repo.RuleSetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PolicyService {

    private final PolicyRepository policyRepository;
    private final RuleSetRepository ruleSetRepository;
    private final LintRunRepository lintRunRepository;
    private final AgentClient agentClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public CreatePolicyResponse createPolicy(CreatePolicyRequest req) {
        String policyId = (req.policyId() == null || req.policyId().isBlank())
                ? "P-" + UUID.randomUUID().toString().substring(0, 8)
                : req.policyId();

        String version = (req.version() == null || req.version().isBlank()) ? "v1" : req.version();

        policyRepository.save(new PolicyEntity(policyId, version, req.regulationText()));
        return new CreatePolicyResponse(policyId, version);
    }

    public BuildPolicyResponse buildPolicy(String policyId, BuildPolicyRequest req) {
        var policy = policyRepository.findById(policyId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "policy not found: " + policyId));

        var knowledgeDocsForAgent = req == null || req.knowledgeDocs() == null
                ? null
                : req.knowledgeDocs().stream()
                        .map(doc -> new AgentDocDto(doc.title(), doc.content()))
                        .toList();

        var agentResp = agentClient.build(new AgentBuildRequest(
                policy.getPolicyId(),
                policy.getRegulationText(),
                knowledgeDocsForAgent
        ));

        String rulesetId = "RS-" + UUID.randomUUID().toString().substring(0, 10);

        String normalizedJson = agentResp.normalized_policy() == null ? null : agentResp.normalized_policy().toString();
        String rulesetJson = agentResp.ruleset() == null ? "{}" : agentResp.ruleset().toString();
        String testsuiteJson = agentResp.testsuite() == null ? null : agentResp.testsuite().toString();
        String verificationJson = agentResp.verification_report() == null ? null : agentResp.verification_report().toString();

        ruleSetRepository.save(new RuleSetEntity(
                rulesetId,
                policy.getPolicyId(),
                normalizedJson,
                rulesetJson,
                testsuiteJson,
                verificationJson
        ));

        return new BuildPolicyResponse(policy.getPolicyId(), rulesetId);
    }

    public LintResponse lint(LintRequest req) {
        var ruleset = ruleSetRepository.findById(req.rulesetId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "ruleset not found: " + req.rulesetId()));

        var rulesetNode = parseJson(ruleset.getRulesetJson());

        // Convert DocDto (title, content) to Agent format (id, content)
        var docsForAgent = req.docs().stream()
                .map(doc -> new AgentDocDto(doc.title(), doc.content()))
                .toList();

        var agentResp = agentClient.lint(new AgentLintRequest(rulesetNode, docsForAgent));

        String runId = "RUN-" + UUID.randomUUID().toString().substring(0, 10);
        var resultNode = objectMapper.createObjectNode();
        resultNode.set("per_doc", agentResp.per_doc());
        lintRunRepository.save(new LintRunEntity(runId, req.rulesetId(), resultNode.toString()));

        return new LintResponse(runId);
    }

    public GetRunResponse getRun(String runId) {
        var run = lintRunRepository.findById(runId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "run not found: " + runId));
        return new GetRunResponse(run.getRunId(), run.getRulesetId(), run.getResultJson());
    }

    private com.fasterxml.jackson.databind.JsonNode parseJson(String s) {
        try {
            if (s == null) return objectMapper.createObjectNode();
            return objectMapper.readTree(s);
        } catch (Exception e) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "invalid json stored in DB");
        }
    }

    public NormalizePolicyResponse normalizePolicy(String policyId, NormalizePolicyRequest req) {
        var policy = policyRepository.findById(policyId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "policy not found: " + policyId));
    
        var knowledgeDocsForAgent =
                (req == null || req.knowledgeDocs() == null)
                        ? List.<AgentDocDto>of()
                        : req.knowledgeDocs().stream()
                            .map(doc -> new AgentDocDto(doc.title(), doc.content()))
                            .toList();
    
        var agentResp = agentClient.normalize(new AgentNormalizeRequest(
                policy.getPolicyId(),
                policy.getRegulationText(),
                knowledgeDocsForAgent
        ));
    
        return new NormalizePolicyResponse(policy.getPolicyId(), agentResp.normalized_policy());
    }
}
