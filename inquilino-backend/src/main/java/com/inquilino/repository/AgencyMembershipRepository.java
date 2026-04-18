package com.inquilino.repository;

import com.inquilino.entity.AgencyMembership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgencyMembershipRepository extends JpaRepository<AgencyMembership, UUID> {
    List<AgencyMembership> findByAgencyUserId(UUID agencyUserId);
    Optional<AgencyMembership> findByAgencyUserIdAndOperatorUserId(UUID agencyUserId, UUID operatorUserId);
    Optional<AgencyMembership> findByOperatorUserId(UUID operatorUserId);
    boolean existsByAgencyUserIdAndOperatorUserId(UUID agencyUserId, UUID operatorUserId);
    void deleteByAgencyUserIdAndOperatorUserId(UUID agencyUserId, UUID operatorUserId);
}
