package com.inquilino.repository;

import com.inquilino.entity.OnboardingState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OnboardingStateRepository extends JpaRepository<OnboardingState, UUID> {

    Optional<OnboardingState> findByUserId(UUID userId);

    List<OnboardingState> findByUserIdIn(Collection<UUID> userIds);

    // ─── Analytics ────────────────────────────────────────────────────────────

    /** Total number of onboarding records (one per user who started onboarding). */
    @Query("SELECT COUNT(s) FROM OnboardingState s")
    long countAll();

    /**
     * Users who have completed a given step (stepId is present in completed_steps JSONB array).
     * Uses the PostgreSQL @> (contains) operator via native query.
     */
    @Query(nativeQuery = true, value = """
            SELECT COUNT(*) FROM onboarding_states
            WHERE completed_steps @> jsonb_build_array(:stepId)::jsonb
            """)
    long countCompletedStep(@Param("stepId") String stepId);

    /** Users whose current_step equals the given stepId (currently blocked here). */
    @Query("SELECT COUNT(s) FROM OnboardingState s WHERE s.currentStep = :stepId")
    long countCurrentlyAt(@Param("stepId") String stepId);

    /**
     * Users who have a non-null, non-empty value for the given field key
     * inside the collected_data JSONB column.
     *
     * NOTE: uses jsonb_exists() instead of the '?' operator to avoid conflict
     * with Spring Data JPA's positional parameter placeholder syntax.
     */
    @Query(nativeQuery = true, value = """
            SELECT COUNT(*) FROM onboarding_states
            WHERE jsonb_exists(collected_data, :fieldKey)
              AND (collected_data ->> :fieldKey) IS NOT NULL
              AND (collected_data ->> :fieldKey) <> ''
            """)
    long countUsersWithField(@Param("fieldKey") String fieldKey);
}
