package com.inquilino.dto.admin;

import com.inquilino.entity.ScoringTemplate;

import java.time.LocalDateTime;
import java.util.UUID;

public record ScoringTemplateDto(
        UUID          id,
        String        name,
        String        description,
        int           weightIdentity,
        int           weightIncome,
        int           weightStability,
        int           weightDocuments,
        int           weightGuarantor,
        boolean       isDefault,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        /** How many VERIFIED profiles are currently linked to this template. */
        long          linkedProfileCount
) {
    public static ScoringTemplateDto from(ScoringTemplate t, long linkedProfileCount) {
        return new ScoringTemplateDto(
                t.getId(), t.getName(), t.getDescription(),
                t.getWeightIdentity(), t.getWeightIncome(), t.getWeightStability(),
                t.getWeightDocuments(), t.getWeightGuarantor(),
                t.isDefault(), t.getCreatedAt(), t.getUpdatedAt(),
                linkedProfileCount
        );
    }
}
