package com.inquilino.dto.guarantor;

import java.math.BigDecimal;

public record GuarantorRequest(
        String     roleLabel,
        String     fullName,
        String     fiscalCode,
        String     employmentType,
        String     contractType,
        String     employmentStartDate,
        String     employmentEndDate,
        BigDecimal declaredMonthlyIncome
) {}
