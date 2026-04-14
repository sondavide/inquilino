package com.inquilino.dto.admin;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ScoringTemplateRequest(

        @NotBlank @Size(max = 100)
        String name,

        String description,

        // ─── Pesi forza-tenant ────────────────────────────────────────────────
        @Min(0) int weightIdentity,
        @Min(0) int weightIncome,
        @Min(0) int weightStability,
        @Min(0) int weightDocuments,
        @Min(0) int weightGuarantor,

        // ─── Pesi per tipo documento ──────────────────────────────────────────
        @Min(0) int docWeightIdentity,
        @Min(0) int docWeightPayslip,
        @Min(0) int docWeightPayslipTripleBonus,
        @Min(0) int docWeightTaxReturn,
        @Min(0) int docWeightEmploymentContract,
        @Min(0) int docWeightBankStatement,
        @Min(0) int docWeightLandlordReference,
        @Min(0) int docWeightGuarantorDocument,

        // ─── Soglie document_reliability ─────────────────────────────────────
        @Min(0) @Max(100) int docReliabilityHighThreshold,
        @Min(0) @Max(100) int docReliabilityMediumThreshold,

        // ─── Soglie income_stability ──────────────────────────────────────────
        @Min(0) @Max(100) int stabilityHighThreshold,
        @Min(0) @Max(100) int stabilityMediumThreshold,
        @Min(0) @Max(100) int studentFamilyWeightPct,

        // ─── Soglie rent_sustainability ───────────────────────────────────────
        @Min(0) @Max(100) int rentHighThresholdPct,
        @Min(0) @Max(100) int rentMediumThresholdPct,
        @Min(0) @Max(100) int guarantorIncomeCreditPct,

        boolean isDefault

) {}
