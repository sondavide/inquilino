package com.inquilino.repository;

import com.inquilino.entity.FieldValidation;
import com.inquilino.enums.FieldValidationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FieldValidationRepository extends JpaRepository<FieldValidation, UUID> {

    List<FieldValidation> findByTenantProfileId(UUID tenantProfileId);

    Optional<FieldValidation> findByTenantProfileIdAndFieldName(UUID tenantProfileId, String fieldName);

    List<FieldValidation> findByTenantProfileIdAndStatus(UUID tenantProfileId, FieldValidationStatus status);

    boolean existsByTenantProfileIdAndFieldNameAndStatus(UUID tenantProfileId, String fieldName, FieldValidationStatus status);
}
