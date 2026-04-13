package com.inquilino.service;

import com.inquilino.dto.supervisor.ScoreDetailDto;
import com.inquilino.dto.tenant.ScoreDto;
import com.inquilino.entity.Document;
import com.inquilino.entity.FieldValidation;
import com.inquilino.entity.ScoreOverride;
import com.inquilino.entity.TenantProfile;
import com.inquilino.enums.EmploymentType;
import com.inquilino.enums.FieldValidationStatus;
import com.inquilino.repository.FieldValidationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Calculates the three categorical reliability scores for a tenant.
 * All thresholds come from descrizione.md — do not change them without updating the spec.
 *
 * Document reliability counts ONLY supervisor-approved documents (FieldValidation APPROVED
 * with fieldName starting with "doc."). AI quick-check is for supervisor guidance only.
 */
@Service
@RequiredArgsConstructor
public class ScoringService {

    private final FieldValidationRepository fieldValidationRepo;

    public ScoreDto calculate(TenantProfile profile, List<Document> documents) {
        UUID profileId = profile != null ? profile.getId() : null;
        return new ScoreDto(
                rentSustainability(profile),
                incomeStability(profile),
                documentReliability(documents, profileId),
                profile != null ? profile.getProfileCompletion() : 0
        );
    }

    /**
     * Full scoring detail for the supervisor view: algorithm values, explanations,
     * override values, and effective (final) values.
     */
    public ScoreDetailDto calculateDetail(TenantProfile profile, List<Document> documents,
                                          ScoreOverride override) {
        UUID profileId = profile != null ? profile.getId() : null;

        String algoRent      = rentSustainability(profile);
        String algoIncome    = incomeStability(profile);
        String algoDoc       = documentReliability(documents, profileId);
        int    algoCompletion = profile != null ? profile.getProfileCompletion() : 0;

        String overrideRent   = override != null ? override.getRentSustainability()   : null;
        String overrideIncome = override != null ? override.getIncomeStability()       : null;
        String overrideDoc    = override != null ? override.getDocumentReliability()   : null;
        String overrideReason = override != null ? override.getReason()                : null;

        return new ScoreDetailDto(
                algoRent,    rentSustainabilityExplanation(profile),
                algoIncome,  incomeStabilityExplanation(profile),
                algoDoc,     documentReliabilityExplanation(documents, profileId),
                algoCompletion,
                overrideRent, overrideIncome, overrideDoc, overrideReason,
                overrideRent   != null ? overrideRent   : algoRent,
                overrideIncome != null ? overrideIncome : algoIncome,
                overrideDoc    != null ? overrideDoc    : algoDoc
        );
    }

    // ─── Rent sustainability ──────────────────────────────────────────────────────
    // HIGH  → affitto <= 30% reddito
    // MEDIUM → 30–50%
    // LOW   → >50%

    private String rentSustainability(TenantProfile p) {
        if (p == null || p.getMonthlyIncome() == null || p.getMaxBudget() == null) return "LOW";
        double income = p.getMonthlyIncome().doubleValue();
        if (income <= 0) return "LOW";
        double ratio = p.getMaxBudget().doubleValue() / income;
        if (ratio <= 0.30) return "HIGH";
        if (ratio <= 0.50) return "MEDIUM";
        return "LOW";
    }

    // ─── Income stability ─────────────────────────────────────────────────────────
    // Derived from employment type

    /** Public accessor used by MatchingService for tenant_strength_score. */
    public String incomeStabilityCategory(TenantProfile p) {
        return incomeStability(p);
    }

    private String incomeStability(TenantProfile p) {
        if (p == null || p.getEmploymentType() == null) return "LOW";
        return switch (p.getEmploymentType()) {
            case EMPLOYEE                      -> "HIGH";
            case SELF_EMPLOYED, RETIRED        -> "MEDIUM";
            case STUDENT, OTHER                -> "LOW";
        };
    }

    // ─── Document reliability ─────────────────────────────────────────────────────
    // Conta solo i documenti approvati dal supervisore (FieldValidation APPROVED).
    // Il quick-check AI è solo un ausilio per il supervisore, non conta nel punteggio.

    /** Public accessor used by MatchingService for tenant_strength_score. */
    public String documentReliabilityCategory(List<Document> docs, UUID tenantProfileId) {
        return documentReliability(docs, tenantProfileId);
    }

    private String documentReliability(List<Document> docs, UUID tenantProfileId) {
        if (docs == null || docs.isEmpty()) return "LOW";

        Set<String> approvedFields = getSupervisorApprovedDocFields(tenantProfileId);
        long approved = docs.stream()
                .filter(d -> approvedFields.contains("doc." + d.getType().name()))
                .count();

        double ratio = (double) approved / docs.size();
        if (ratio >= 0.7) return "HIGH";
        if (ratio >= 0.3) return "MEDIUM";
        return "LOW";
    }

    /**
     * Returns the set of field names (e.g. "doc.PAYSLIP") that the supervisor has
     * explicitly approved for the given profile.
     */
    public Set<String> getSupervisorApprovedDocFields(UUID tenantProfileId) {
        if (tenantProfileId == null) return Set.of();
        return fieldValidationRepo
                .findByTenantProfileIdAndStatus(tenantProfileId, FieldValidationStatus.APPROVED)
                .stream()
                .map(FieldValidation::getFieldName)
                .filter(f -> f.startsWith("doc."))
                .collect(Collectors.toSet());
    }

    // ─── Explanation builders ────────────────────────────────────────────────────

    private String rentSustainabilityExplanation(TenantProfile p) {
        if (p == null || p.getMonthlyIncome() == null || p.getMaxBudget() == null)
            return "Dati insufficienti (reddito o affitto massimo non dichiarati) → LOW";
        double income = p.getMonthlyIncome().doubleValue();
        if (income <= 0)
            return "Reddito dichiarato pari a 0 → LOW";
        double ratio = p.getMaxBudget().doubleValue() / income * 100;
        return String.format(
                "Affitto max €%.0f / Reddito mensile €%.0f = %.1f%% "
                + "— soglie: ≤30%% HIGH · 30–50%% MEDIUM · >50%% LOW",
                p.getMaxBudget().doubleValue(), income, ratio);
    }

    private String incomeStabilityExplanation(TenantProfile p) {
        if (p == null || p.getEmploymentType() == null)
            return "Tipo di impiego non dichiarato → LOW";
        String label = switch (p.getEmploymentType()) {
            case EMPLOYEE      -> "Dipendente (EMPLOYEE) → HIGH";
            case SELF_EMPLOYED -> "Autonomo (SELF_EMPLOYED) → MEDIUM";
            case RETIRED       -> "Pensionato (RETIRED) → MEDIUM";
            case STUDENT       -> "Studente (STUDENT) → LOW";
            case OTHER         -> "Altro (OTHER) → LOW";
        };
        return "Tipo di impiego: " + label
                + " — regola: EMPLOYEE→HIGH · SELF_EMPLOYED/RETIRED→MEDIUM · STUDENT/OTHER→LOW";
    }

    private String documentReliabilityExplanation(List<Document> docs, UUID tenantProfileId) {
        if (docs == null || docs.isEmpty())
            return "Nessun documento caricato → LOW";
        Set<String> approvedFields = getSupervisorApprovedDocFields(tenantProfileId);
        long approved = docs.stream()
                .filter(d -> approvedFields.contains("doc." + d.getType().name()))
                .count();
        double ratio = (double) approved / docs.size() * 100;
        return String.format(
                "%d documento/i approvato/i dal supervisore su %d totali (%.0f%%) "
                + "— soglie: ≥70%% HIGH · 30–69%% MEDIUM · <30%% LOW "
                + "(solo approvazioni supervisore contano; il check AI è ausiliario)",
                approved, docs.size(), ratio);
    }
}
