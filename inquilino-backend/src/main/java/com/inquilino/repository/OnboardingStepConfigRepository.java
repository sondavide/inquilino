package com.inquilino.repository;

import com.inquilino.entity.OnboardingStepConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OnboardingStepConfigRepository extends JpaRepository<OnboardingStepConfig, String> {
    // PK is stepId (String), so findById("STEP_03") works out of the box.
}
