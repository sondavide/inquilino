package com.inquilino.repository;

import com.inquilino.entity.ProfileAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ProfileAuditLogRepository extends JpaRepository<ProfileAuditLog, UUID> {

    Page<ProfileAuditLog> findByTenantProfileIdOrderByCreatedAtDesc(UUID tenantProfileId, Pageable pageable);

    Page<ProfileAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
