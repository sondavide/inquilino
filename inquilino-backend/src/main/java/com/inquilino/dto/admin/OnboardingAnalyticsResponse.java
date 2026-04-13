package com.inquilino.dto.admin;

import java.util.List;

public record OnboardingAnalyticsResponse(
        long totalUsers,
        List<StepAnalyticsDto> steps
) {
    public record StepAnalyticsDto(
            String stepId,
            int stepNumber,
            long completedCount,
            long currentlyAtCount,
            double completionRatePct,   // completedCount / totalUsers * 100
            double stuckRatePct,        // currentlyAtCount / totalUsers * 100
            List<FieldPopulationDto> fields
    ) {}

    public record FieldPopulationDto(
            String key,
            String labelIt,
            boolean required,
            long populatedCount,
            double populationRatePct    // populatedCount / totalUsers * 100
    ) {}
}
