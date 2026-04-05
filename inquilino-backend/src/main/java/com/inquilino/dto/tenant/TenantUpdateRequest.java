package com.inquilino.dto.tenant;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Fields the tenant may update.
 * Fields that are null are ignored (partial update semantics).
 * Fields marked "identity/employment" are rejected if profile is VERIFIED.
 */
public record TenantUpdateRequest(
        // Always editable
        BigDecimal maxBudget,
        LocalDate  moveInDate,
        Integer    occupants,
        Boolean    hasPets,
        Boolean    smoker,

        // Editable only when verificationStatus != VERIFIED
        String     fullName,
        LocalDate  birthDate,
        String     birthPlace,
        String     residence,
        String     employmentType,
        BigDecimal monthlyIncome,
        String     contractType,
        LocalDate  employmentStartDate,
        Boolean    hasGuarantor,
        BigDecimal guarantorIncome
) {}
