package com.polint.infra.persistence.repo;

import com.polint.infra.persistence.entity.RuleSetEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RuleSetRepository extends JpaRepository<RuleSetEntity, String> {}
