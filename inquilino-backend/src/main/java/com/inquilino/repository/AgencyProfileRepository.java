package com.inquilino.repository;

import com.inquilino.entity.AgencyProfile;
import com.inquilino.enums.AgencyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgencyProfileRepository extends JpaRepository<AgencyProfile, UUID> {
    Optional<AgencyProfile> findByUserId(UUID userId);
    boolean existsByUserId(UUID userId);
    Page<AgencyProfile> findByStatus(AgencyStatus status, Pageable pageable);
    List<AgencyProfile> findByStatus(AgencyStatus status);
}
