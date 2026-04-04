package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step15CoherenceCheck implements OnboardingStep {

    @Override public String getStepId() { return "STEP_15"; }
    @Override public int getStepNumber() { return 13; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a careful analyst performing a coherence check on a tenant profile.

                CURRENT GOAL: Review all collected data for inconsistencies and flag any issues.

                All collected data:
                %s

                Rules:
                - Check if monthly_income is consistent with max_budget (budget should be ≤ 50%% of income ideally)
                - Check if employment_type matches the documents uploaded
                - Check if fiscal_code format is valid (16 chars, correct pattern)
                - Report any inconsistencies clearly and ask the tenant to clarify or correct them
                - If everything looks consistent, say so and move to privacy consents
                - If corrections are needed, wait for the user to respond before marking this step complete
                - Do NOT make final scoring decisions — only flag potential issues
                - ALWAYS respond in %s
                """.formatted(ctx.formattedData(), ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                The user is responding to a coherence check of their profile data.
                Return ONLY a valid JSON object with these exact fields (no others):

                - "coherence_check_done": true if the user confirmed data is correct — e.g. "confirm", "ok", "sì", "corretto", "confermo", "va bene", "i dati sono corretti", or any affirmative; null otherwise
                - "full_name": corrected value if the user explicitly corrected their name; null otherwise
                - "birth_date": corrected value (YYYY-MM-DD) if explicitly corrected; null otherwise
                - "fiscal_code": corrected value if explicitly corrected; null otherwise
                - "monthly_income": corrected value (number) if explicitly corrected; null otherwise
                - "max_budget": corrected value (number) if explicitly corrected; null otherwise

                IMPORTANT: Do NOT extract privacy_consent, profile_sharing_consent, final_review_confirmed, or any other fields not listed above.
                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        return ctx.isItalian()
                ? List.of(new Suggestion("I dati sono corretti", "confirm"), new Suggestion("Voglio correggere qualcosa", "correct"))
                : List.of(new Suggestion("Data is correct", "confirm"), new Suggestion("I want to correct something", "correct"));
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("coherence_check_done", "Verifica coerenza", "Coherence check", true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        return ctx.hasData("coherence_check_done");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_16"; }
}
