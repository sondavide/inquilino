package com.inquilino.dto.admin;

import java.time.LocalDateTime;

/**
 * Sent to / received from the superadmin for a single step's prompt config.
 *
 * Template variables usable inside system/extraction prompts:
 *   {{collected_data}} — current user data formatted for the LLM
 *   {{lang}}           — "Italian" or "English"
 *
 * The {@code default*} fields are read-only: they contain the text currently produced
 * by the hardcoded Java step (evaluated with an empty context) and are shown as
 * placeholder text in the admin editor when no override is active.
 */
public record StepConfigDto(
        String stepId,
        String systemPromptOverride,
        String extractionPromptOverride,
        String adminNotes,
        LocalDateTime updatedAt,
        String updatedBy,
        /** Read-only — the current hardcoded system prompt (empty context, Italian). */
        String defaultSystemPrompt,
        /** Read-only — the current hardcoded extraction prompt (empty context). */
        String defaultExtractionPrompt
) {}
