package com.inquilino.repository;

import com.inquilino.entity.SupervisorNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupervisorNoteRepository extends JpaRepository<SupervisorNote, UUID> {

    List<SupervisorNote> findByTenantProfileIdOrderBySentAtDesc(UUID tenantProfileId);

    List<SupervisorNote> findByTenantProfileIdAndStatusOrderBySentAtDesc(UUID tenantProfileId, String status);

    long countByTenantProfileIdAndStatus(UUID tenantProfileId, String status);
}
