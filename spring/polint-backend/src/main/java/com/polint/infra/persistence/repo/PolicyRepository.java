package com.polint.infra.persistence.repo;

import com.polint.infra.persistence.entity.PolicyEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyRepository extends JpaRepository<PolicyEntity, String> {}
