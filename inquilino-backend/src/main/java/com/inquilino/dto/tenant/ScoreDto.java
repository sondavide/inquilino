package com.inquilino.dto.tenant;

public record ScoreDto(
        String rentSustainability,   // HIGH | MEDIUM | LOW
        String incomeStability,      // HIGH | MEDIUM | LOW
        String documentReliability,  // HIGH | MEDIUM | LOW
        int profileCompleteness
) {}
