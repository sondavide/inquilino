package com.inquilino.dto.guarantor;

import com.inquilino.entity.Guarantor;

import java.math.BigDecimal;
import java.util.UUID;

public record GuarantorDto(
        UUID       id,
        UUID       tenantProfileId,
        String     roleLabel,
        String     fullName,
        String     fiscalCode,
        String     employmentType,
        String     contractType,
        String     employmentStartDate,
        String     employmentEndDate,
        BigDecimal declaredMonthlyIncome,
        BigDecimal verifiedMonthlyIncome,
        boolean    incomeVerified,
        String     enteredByRole,
        String     createdAt
) {
    public static GuarantorDto from(Guarantor g) {
        return new GuarantorDto(
                g.getId(),
                g.getTenantProfileId(),
                g.getRoleLabel(),
                g.getFullName(),
                g.getFiscalCode(),
                g.getEmploymentType()      != null ? g.getEmploymentType().name() : null,
                g.getContractType()        != null ? g.getContractType().name() : null,
                g.getEmploymentStartDate() != null ? g.getEmploymentStartDate().toString() : null,
                g.getEmploymentEndDate()   != null ? g.getEmploymentEndDate().toString() : null,
                g.getDeclaredMonthlyIncome(),
                g.getVerifiedMonthlyIncome(),
                g.isIncomeVerified(),
                g.getEnteredByRole(),
                g.getCreatedAt()           != null ? g.getCreatedAt().toString() : null
        );
    }
}
