package com.polint.infra.persistence.repo;

import com.polint.infra.persistence.entity.LintRunEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LintRunRepository extends JpaRepository<LintRunEntity, String> {}
