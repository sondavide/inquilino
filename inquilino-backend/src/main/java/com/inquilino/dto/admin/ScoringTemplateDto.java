package com.inquilino.dto.admin;

import com.inquilino.entity.ScoringTemplate;

import java.time.LocalDateTime;
import java.util.UUID;

public record ScoringTemplateDto(
        UUID          id,
        String        name,
        String        description,

        // Pesi forza-tenant (matching)
        int           weightIdentity,
        int           weightIncome,
        int           weightStability,
        int           weightDocuments,
        int           weightGuarantor,

        // Pesi per tipo documento
        int           docWeightIdentity,
        int           docWeightPayslip,
        int           docWeightPayslipTripleBonus,
        int           docWeightTaxReturn,
        int           docWeightEmploymentContract,
        int           docWeightBankStatement,
        int           docWeightLandlordReference,
        int           docWeightGuarantorDocument,

        // Soglie document_reliability
        int           docReliabilityHighThreshold,
        int           docReliabilityMediumThreshold,

        // Soglie income_stability
        int           stabilityHighThreshold,
        int           stabilityMediumThreshold,
        int           studentFamilyWeightPct,

        // Soglie rent_sustainability
        int           rentHighThresholdPct,
        int           rentMediumThresholdPct,
        int           guarantorIncomeCreditPct,

        boolean       isDefault,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        long          linkedProfileCount
) {
    public static ScoringTemplateDto from(ScoringTemplate t, long linkedProfileCount) {
        return new ScoringTemplateDto(
                t.getId(), t.getName(), t.getDescription(),
                t.getWeightIdentity(), t.getWeightIncome(), t.getWeightStability(),
                t.getWeightDocuments(), t.getWeightGuarantor(),
                t.getDocWeightIdentity(), t.getDocWeightPayslip(),
                t.getDocWeightPayslipTripleBonus(), t.getDocWeightTaxReturn(),
                t.getDocWeightEmploymentContract(), t.getDocWeightBankStatement(),
                t.getDocWeightLandlordReference(), t.getDocWeightGuarantorDocument(),
                t.getDocReliabilityHighThreshold(), t.getDocReliabilityMediumThreshold(),
                t.getStabilityHighThreshold(), t.getStabilityMediumThreshold(),
                t.getStudentFamilyWeightPct(),
                t.getRentHighThresholdPct(), t.getRentMediumThresholdPct(),
                t.getGuarantorIncomeCreditPct(),
                t.isDefault(), t.getCreatedAt(), t.getUpdatedAt(),
                linkedProfileCount
        );
    }
}
