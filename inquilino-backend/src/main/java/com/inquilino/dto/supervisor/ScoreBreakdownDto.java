package com.inquilino.dto.supervisor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Breakdown completo del calcolo dei tre indicatori di affidabilità.
 * Mostra al supervisore: input usati, punteggi parziali, livello finale
 * e suggerimenti con impatto stimato sugli indicatori.
 */
public record ScoreBreakdownDto(

        // ─── Sostenibilità canone ────────────────────────────────────────────
        RentBreakdown  rent,

        // ─── Stabilità reddituale ────────────────────────────────────────────
        IncomeBreakdown income,

        // ─── Affidabilità documentale ────────────────────────────────────────
        DocBreakdown docs,

        // ─── Override supervisore ────────────────────────────────────────────
        String overrideRentSustainability,
        String overrideIncomeStability,
        String overrideDocumentReliability,
        String overrideReason,

        // ─── Completezza profilo ─────────────────────────────────────────────
        int profileCompletion,

        // ─── Suggerimenti con impatto stimato ────────────────────────────────
        List<ScoreSuggestion> suggestions

) {

    // ─── Rent breakdown ───────────────────────────────────────────────────────

    public record RentBreakdown(
            BigDecimal declaredIncome,
            BigDecimal verifiedIncome,
            BigDecimal incomeUsed,
            BigDecimal guarantorTotalIncome,
            BigDecimal guarantorCredit,
            BigDecimal effectiveIncome,
            BigDecimal maxBudget,
            Double     ratioPercent,
            String     level,
            String     explanation
    ) {}

    // ─── Income stability breakdown ───────────────────────────────────────────

    public record IncomeBreakdown(
            String employmentType,
            String contractType,

            // Fattore A: base occupazione
            int    factorA,
            String factorAExplanation,

            // Fattore B: continuità
            int    factorB,
            String factorBExplanation,

            // Fattore C: verifica documentale reddito
            int    factorC,
            String factorCExplanation,

            // Fattore D: rete di sicurezza
            int    factorD,
            String factorDExplanation,

            // Totale standard (usato per non-studenti o come student_own_score)
            int    totalScore,
            String level,

            // Solo per STUDENT: calcolo combinato
            boolean isStudent,
            Integer familyScore,
            Integer familyScoreA,
            Integer familyScoreB,
            Integer familyScoreC,
            Integer familyScoreD,
            String  familyExplanation,
            Integer combinedScore,
            Integer studentWeightPct,
            Integer familyWeightPct
    ) {}

    // ─── Document reliability breakdown ─────────────────────────────────────

    public record DocBreakdown(
            List<DocLine> lines,
            int    totalScore,
            String level,
            String explanation
    ) {}

    public record DocLine(
            String  type,
            int     count,
            boolean approved,
            int     pointsEarned,
            int     maxPoints,
            boolean isBonus
    ) {}

    // ─── Suggerimento ────────────────────────────────────────────────────────

    public record ScoreSuggestion(
            /** "rent_sustainability" | "income_stability" | "document_reliability" */
            String category,
            /** Descrizione dell'azione da compiere */
            String action,
            /** Livello stimato dopo l'azione */
            String projectedLevel,
            /** Punti stimati aggiuntivi (per income_stability / document_reliability) */
            Integer estimatedPointGain,
            /** Tipo documento (enum name) per suggerimenti document_reliability — usato dal frontend per la traduzione */
            String documentType
    ) {}
}
