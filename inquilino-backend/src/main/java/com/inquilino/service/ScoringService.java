package com.inquilino.service;

import com.inquilino.dto.tenant.ScoreDto;
import com.inquilino.entity.Document;
import com.inquilino.entity.TenantProfile;
import com.inquilino.enums.EmploymentType;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Calculates the three categorical reliability scores for a tenant.
 * All thresholds come from descrizione.md — do not change them without updating the spec.
 */
@Service
public class ScoringService {

    public ScoreDto calculate(TenantProfile profile, List<Document> documents) {
        return new ScoreDto(
                rentSustainability(profile),
                incomeStability(profile),
                documentReliability(documents),
                profile != null ? profile.getProfileCompletion() : 0
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

    private String incomeStability(TenantProfile p) {
        if (p == null || p.getEmploymentType() == null) return "LOW";
        return switch (p.getEmploymentType()) {
            case EMPLOYEE                      -> "HIGH";
            case SELF_EMPLOYED, RETIRED        -> "MEDIUM";
            case STUDENT, OTHER                -> "LOW";
        };
    }

    // ─── Document reliability ─────────────────────────────────────────────────────
    // Based on ratio of verified documents to total

    private String documentReliability(List<Document> docs) {
        if (docs == null || docs.isEmpty()) return "LOW";
        long verified = docs.stream().filter(Document::isVerified).count();
        double ratio  = (double) verified / docs.size();
        if (ratio >= 0.7) return "HIGH";
        if (ratio >= 0.3) return "MEDIUM";
        return "LOW";
    }
}
