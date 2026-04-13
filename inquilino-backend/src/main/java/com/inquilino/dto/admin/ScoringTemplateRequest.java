package com.inquilino.dto.admin;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ScoringTemplateRequest(

        @NotBlank
        @Size(max = 100)
        String name,

        String description,

        @Min(0) int weightIdentity,
        @Min(0) int weightIncome,
        @Min(0) int weightStability,
        @Min(0) int weightDocuments,
        @Min(0) int weightGuarantor,

        boolean isDefault
) {}
