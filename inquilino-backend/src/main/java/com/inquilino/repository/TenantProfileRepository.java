package com.inquilino.repository;

import com.inquilino.entity.TenantProfile;
import com.inquilino.enums.UserType;
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

    Page<TenantProfile> findByVerificationStatusInAndUserType(
            List<VerificationStatus> statuses, UserType userType, Pageable pageable);

    /** Matching: profili verificati e attivi i cui user_id sono nella lista. */
    List<TenantProfile> findByUserIdInAndVerificationStatusAndActiveTrue(
            List<UUID> userIds, VerificationStatus verificationStatus);

    /** Scoring templates: profili verificati collegati a un dato template. */
    List<TenantProfile> findByScoringTemplateIdAndVerificationStatus(
            UUID scoringTemplateId, VerificationStatus verificationStatus);

    /** Scoring templates: conteggio profili collegati a un dato template (qualsiasi stato). */
    long countByScoringTemplateId(UUID scoringTemplateId);
}
