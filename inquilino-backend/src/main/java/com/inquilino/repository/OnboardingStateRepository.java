package com.inquilino.repository;

import com.inquilino.entity.OnboardingState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OnboardingStateRepository extends JpaRepository<OnboardingState, UUID> {

    Optional<OnboardingState> findByUserId(UUID userId);

    List<OnboardingState> findByUserIdIn(Collection<UUID> userIds);
}
