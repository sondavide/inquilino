package com.inquilino.dto.tenant;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record TenantProfileResponse(
        // ─── User ────────────────────────────────────────────────────────────────
        String email,
        String phone,

        // ─── Onboarding ──────────────────────────────────────────────────────────
        boolean onboardingCompleted,

        // ─── Profile (null if not built yet) ─────────────────────────────────────
        UUID profileId,
        String fullName,
        LocalDate birthDate,
        String birthPlace,
        String residence,
        String fiscalCode,

        String employmentType,
        BigDecimal monthlyIncome,
        String contractType,
        LocalDate employmentStartDate,

        boolean hasGuarantor,
        BigDecimal guarantorIncome,

        BigDecimal maxBudget,
        LocalDate moveInDate,
        Integer occupants,
        boolean hasPets,
        boolean smoker,
        List<Map<String, Object>> desiredLocations,

        int profileCompletion,
        String verificationStatus,
        boolean active,

        // ─── Score ────────────────────────────────────────────────────────────────
        ScoreDto score,

        // ─── Documents ───────────────────────────────────────────────────────────
        List<DocumentDto> documents,

        // ─── Interest areas ──────────────────────────────────────────────────────
        List<InterestAreaDto> interestAreas
) {}
