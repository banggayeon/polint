package com.polint.infra.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Entity
@Table(name = "policy")
@Getter
@NoArgsConstructor
public class PolicyEntity {
    @Id
    @Column(name = "policy_id", nullable = false)
    private String policyId;

    @Column(nullable = false)
    private String version;

    @Column(name = "regulation_text", nullable = false, columnDefinition = "text")
    private String regulationText;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public PolicyEntity(String policyId, String version, String regulationText) {
        this.policyId = policyId;
        this.version = version;
        this.regulationText = regulationText;
        this.createdAt = OffsetDateTime.now();
    }
}
