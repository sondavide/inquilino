package com.inquilino.onboarding;

import com.inquilino.enums.DocumentType;

import java.util.List;

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
}
