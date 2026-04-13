package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class Step17FinalReview implements OnboardingStep {

    @Override public String getStepId() { return "STEP_17"; }
    @Override public int getStepNumber() { return 15; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant completing a tenant reliability profile.

                CURRENT GOAL: Show a final summary and get the tenant's confirmation to submit.

                All collected data:
                %s

                Rules:
                - Present a clear, well-formatted summary of all collected information
                - Group it by sections: Personal info, Housing preferences, Employment & income, Documents, Consents
                - Point out any missing optional fields that could strengthen the profile
                - Ask: "Does everything look correct? Shall I submit your profile?"
                - If the user wants to correct something, allow them to (set "final_correction_requested": true)
                - If the user confirms, set "final_review_confirmed": true and submit
                - ALWAYS respond in %s
                """.formatted(ctx.formattedData(), ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract the user's response to the final profile review.
                Return ONLY a valid JSON object.

                Fields:
                - "final_review_confirmed": true if user confirms submission — e.g. "confirm", "invia", "sì", "ok", "tutto corretto", "conferma", "invia il profilo", or any affirmative to submit; null otherwise
                - "final_correction_requested": true if user says they want to change something; null otherwise

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        return ctx.isItalian()
                ? List.of(
                    new Suggestion("Tutto corretto, invia il profilo", "confirm"),
                    new Suggestion("Voglio correggere qualcosa", "correct"))
                : List.of(
                    new Suggestion("All correct, submit profile", "confirm"),
                    new Suggestion("I want to correct something", "correct"));
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("final_review_confirmed", "Revisione finale", "Final review", true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        return ctx.getBooleanData("final_review_confirmed");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_18"; }

    @Override
    public Optional<String> nextMissingField(OnboardingContext ctx) {
        if (!ctx.getBooleanData("final_review_confirmed")) return Optional.of("final_review_confirmed");
        return Optional.empty();
    }

    @Override
    public String fieldHint(String field, OnboardingContext ctx) {
        return "Present a clear, well-formatted summary of all collected data grouped by section. " +
               "Ask the user to confirm everything is correct and to submit the profile.";
    }
}
