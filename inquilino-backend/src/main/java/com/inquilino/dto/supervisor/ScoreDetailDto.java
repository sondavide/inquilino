package com.inquilino.dto.supervisor;

/**
 * Full score detail for the supervisor view.
 * Each indicator carries the algorithm value, a human-readable explanation,
 * and the optional supervisor override.  The "effective" value is the override
 * when present, otherwise the algorithm result.
 */
public record ScoreDetailDto(

        // ── Algorithm ─────────────────────────────────────────────────────────
        String algoRentSustainability,
        String algoRentSustainabilityExplanation,

        String algoIncomeStability,
        String algoIncomeStabilityExplanation,

        String algoDocumentReliability,
        String algoDocumentReliabilityExplanation,

        int    algoProfileCompleteness,

        // ── Override (null = not set) ─────────────────────────────────────────
        String overrideRentSustainability,
        String overrideIncomeStability,
        String overrideDocumentReliability,
        String overrideReason,

        // ── Effective values (override ?? algo) ───────────────────────────────
        String rentSustainability,
        String incomeStability,
        String documentReliability
) {}
