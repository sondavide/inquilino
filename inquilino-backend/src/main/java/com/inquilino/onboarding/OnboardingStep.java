package com.inquilino.onboarding;

import com.inquilino.enums.DocumentType;

import java.util.List;
import java.util.Optional;

/**
 * Each onboarding step is a Spring @Component that implements this interface.
 * To add a new step: create a new @Component, implement this interface, done.
 */
public interface OnboardingStep {

    /** Unique step identifier, e.g. "STEP_03". */
    String getStepId();

    /** 1-based position for progress bar calculation. */
    int getStepNumber();

    /** System prompt for the conversational LLM call (gpt-4o-mini). */
    String buildSystemPrompt(OnboardingContext ctx);

    /**
     * System prompt for the lightweight extraction call that runs after each user message.
     * Must instruct the LLM to return ONLY a JSON object.
     */
    String buildExtractionPrompt(OnboardingContext ctx);

    /** Quick-reply chips shown above the input bar. Empty = no chips. */
    List<Suggestion> getSuggestions(OnboardingContext ctx);

    /** Items this step contributes to the horizontal checklist bar. */
    List<ChecklistItem> getChecklistItems();

    /** Returns true when all required data for this step has been collected. */
    boolean isCompleted(OnboardingContext ctx);

    /** Returns the step ID to transition to when this step is complete. */
    String resolveNextStep(OnboardingContext ctx);

    /** True if this step expects document uploads. Shows the upload button prominently. */
    default boolean requiresDocumentUpload() { return false; }

    /** Document types expected in this step. */
    default List<DocumentType> getExpectedDocumentTypes() { return List.of(); }

    /**
     * Returns the key of the next field to collect from the user, in priority order.
     * The service uses this — not the LLM signal — as the authoritative trigger for
     * step advancement: when this returns Optional.empty() the step is done.
     *
     * Returns Optional.empty() for:
     * - document-upload steps (advancement is triggered by the upload system)
     * - terminal steps
     * - when all fields have been collected or asked
     *
     * For optional fields: return the field key until it has been asked at least once
     * (tracked via the "_asked_<field>" internal marker in collectedData).
     */
    default Optional<String> nextMissingField(OnboardingContext ctx) {
        return Optional.empty();
    }

    /**
     * Returns a concise English instruction for the LLM describing how to ask for
     * the given field. Only called when nextMissingField() returns a non-empty value.
     */
    default String fieldHint(String field, OnboardingContext ctx) {
        return "Ask the user for their " + field.replace("_", " ") + ".";
    }
}
