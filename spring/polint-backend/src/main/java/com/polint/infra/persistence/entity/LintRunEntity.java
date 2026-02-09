package com.polint.infra.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "lint_run")
@Getter
@NoArgsConstructor
public class LintRunEntity {

    @Id
    @Column(name = "run_id", nullable = false)
    private String runId;

    @Column(name = "ruleset_id", nullable = false)
    private String rulesetId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "result_json", nullable = false, columnDefinition = "jsonb")
    private String resultJson;

    public LintRunEntity(String runId, String rulesetId, String resultJson) {
        this.runId = runId;
        this.rulesetId = rulesetId;
        this.createdAt = OffsetDateTime.now();
        this.resultJson = resultJson;
    }
}
