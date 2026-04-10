package com.inquilino.repository;

import com.inquilino.entity.ScoreOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScoreOverrideRepository extends JpaRepository<ScoreOverride, UUID> {

    Optional<ScoreOverride> findByTenantProfileId(UUID tenantProfileId);

    void deleteByTenantProfileId(UUID tenantProfileId);
}
