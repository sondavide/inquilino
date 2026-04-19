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
    @Override public int getStepNumber() { return 14; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant completing a tenant reliability profile.

                CURRENT GOAL: Show a final summary and get the tenant's confirmation to submit.

                All collected data:
                %s

                CRITICAL RULES (non-negotiable):
                1. NEVER ask for new information. Do NOT ask for name, email, income, or ANY other field.
                2. Show a summary of ONLY the data already collected above — even if it is sparse or incomplete.
                3. If no data was collected, write: "Il profilo è pronto per essere inviato. Confermi?" (or English equivalent) and stop.
                4. Group available data by: Informazioni personali, Preferenze abitative, Lavoro e reddito, Documenti, Consensi.
                5. Mention (briefly) any optional fields that could strengthen the profile — do NOT ask for them.
                6. Ask ONE question: "Tutto corretto? Posso inviare il profilo?" (or English equivalent).
                7. If the user confirms → profile is submitted.
                8. If the user wants to correct something → note it (field: "final_correction_requested": true).
                9. ALWAYS respond in %s.
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
        return List.of(); // Il bottone OK è gestito direttamente dal frontend
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
