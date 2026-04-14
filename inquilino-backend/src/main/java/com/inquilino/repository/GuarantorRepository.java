package com.inquilino.repository;

import com.inquilino.entity.Guarantor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GuarantorRepository extends JpaRepository<Guarantor, UUID> {

    List<Guarantor> findByTenantProfileIdOrderByCreatedAtAsc(UUID tenantProfileId);

    void deleteByTenantProfileId(UUID tenantProfileId);
}
