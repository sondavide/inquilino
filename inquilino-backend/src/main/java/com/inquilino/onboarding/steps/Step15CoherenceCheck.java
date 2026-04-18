package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

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

                CRITICAL RULES (follow in order):
                1. NEVER ask for new data — your ONLY job is to review what is already collected.
                2. NEVER ask for email, name, or any other field that is not listed above.
                3. If the data above is empty or very sparse (fewer than 5 fields), respond with one brief sentence confirming everything looks fine so far, then stop. Do NOT ask for any information.
                4. If data is present, check:
                   - monthly_income consistent with max_budget (budget ≤ 50%% of income ideally)
                   - employment_type matches documents uploaded
                   - fiscal_code format valid (16 chars)
                5. Report any inconsistencies and ask the tenant to clarify — wait for their response.
                6. If everything is consistent (or there is nothing to check), say so in one sentence and stop.
                7. Do NOT make final scoring decisions — only flag potential issues.
                8. ALWAYS respond in %s.
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
        return List.of(); // chips caused LLM to meta-ask about the check itself
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("coherence_check_done", "Verifica coerenza", "Coherence check", true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        // Auto-skip if fewer than 5 meaningful fields — nothing substantial to check
        if (meaningfulFieldCount(ctx) < 5) return true;
        return ctx.hasData("coherence_check_done");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_16"; }

    @Override
    public Optional<String> nextMissingField(OnboardingContext ctx) {
        if (meaningfulFieldCount(ctx) < 5) return Optional.empty();
        if (!ctx.hasData("coherence_check_done")) return Optional.of("coherence_check_done");
        return Optional.empty();
    }

    private static long meaningfulFieldCount(OnboardingContext ctx) {
        return ctx.data().entrySet().stream()
                .filter(e -> !e.getKey().startsWith("_"))
                .count();
    }

    @Override
    public String fieldHint(String field, OnboardingContext ctx) {
        return "Review all collected data for inconsistencies. Flag any issues and ask the user to confirm or correct them. " +
               "Once they confirm, the step is complete.";
    }
}
