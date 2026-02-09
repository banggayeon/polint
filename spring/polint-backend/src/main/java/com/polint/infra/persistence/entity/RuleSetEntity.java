package com.polint.infra.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "ruleset")
@Getter
@NoArgsConstructor
public class RuleSetEntity {

    @Id
    @Column(name = "ruleset_id", nullable = false)
    private String rulesetId;

    @Column(name = "policy_id", nullable = false)
    private String policyId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "normalized_policy_json", columnDefinition = "jsonb")
    private String normalizedPolicyJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ruleset_json", nullable = false, columnDefinition = "jsonb")
    private String rulesetJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "testsuite_json", columnDefinition = "jsonb")
    private String testsuiteJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "verification_report_json", columnDefinition = "jsonb")
    private String verificationReportJson;

    public RuleSetEntity(String rulesetId, String policyId, String normalizedPolicyJson, String rulesetJson, String testsuiteJson, String verificationReportJson) {
        this.rulesetId = rulesetId;
        this.policyId = policyId;
        this.createdAt = OffsetDateTime.now();
        this.normalizedPolicyJson = normalizedPolicyJson;
        this.rulesetJson = rulesetJson;
        this.testsuiteJson = testsuiteJson;
        this.verificationReportJson = verificationReportJson;
    }
}
