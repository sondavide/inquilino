package com.inquilino.repository;

import com.inquilino.entity.ProfileAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ProfileAuditLogRepository extends JpaRepository<ProfileAuditLog, UUID> {

    Page<ProfileAuditLog> findByTenantProfileIdOrderByCreatedAtDesc(UUID tenantProfileId, Pageable pageable);

    Page<ProfileAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
            SELECT l FROM ProfileAuditLog l
            WHERE (:profileId IS NULL OR l.tenantProfileId = :profileId)
              AND (LOWER(CAST(l.action AS string))      LIKE :q
                OR LOWER(l.actorType)                   LIKE :q
                OR LOWER(l.fieldName)                   LIKE :q
                OR LOWER(l.note)                        LIKE :q
                OR LOWER(l.oldValue)                    LIKE :q
                OR LOWER(l.newValue)                    LIKE :q)
            ORDER BY l.createdAt DESC
            """)
    Page<ProfileAuditLog> search(
            @Param("profileId") UUID profileId,
            @Param("q") String q,
            Pageable pageable);
}
