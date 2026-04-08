package com.inquilino.repository;

import com.inquilino.entity.TenantProfile;
import com.inquilino.enums.VerificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TenantProfileRepository extends JpaRepository<TenantProfile, UUID> {

    Optional<TenantProfile> findByUserId(UUID userId);

    List<TenantProfile> findByVerificationStatusOrderByUserIdAsc(VerificationStatus status);

    List<TenantProfile> findByVerificationStatusIn(List<VerificationStatus> statuses);

    Page<TenantProfile> findByVerificationStatusIn(List<VerificationStatus> statuses, Pageable pageable);

    /** Matching: profili verificati e attivi i cui user_id sono nella lista. */
    List<TenantProfile> findByUserIdInAndVerificationStatusAndActiveTrue(
            List<UUID> userIds, VerificationStatus verificationStatus);
}
