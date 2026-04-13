package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "onboarding_step_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OnboardingStepConfig {

    /** Must match OnboardingStep.getStepId(), e.g. "STEP_03". */
    @Id
    @Column(name = "step_id", nullable = false, length = 20)
    private String stepId;

    /**
     * Full system-prompt override. If set, replaces buildSystemPrompt() entirely.
     * Supports {{collected_data}} and {{lang}} as template variables.
     */
    @Column(name = "system_prompt_override", columnDefinition = "TEXT")
    private String systemPromptOverride;

    /**
     * Extraction-prompt override. If set, replaces buildExtractionPrompt() entirely.
     * Supports {{collected_data}} and {{lang}} as template variables.
     */
    @Column(name = "extraction_prompt_override", columnDefinition = "TEXT")
    private String extractionPromptOverride;

    /** Internal admin notes — never sent to the LLM. */
    @Column(name = "admin_notes", columnDefinition = "TEXT")
    private String adminNotes;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 255)
    private String updatedBy;
}
