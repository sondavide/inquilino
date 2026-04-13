package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class Step08Household implements OnboardingStep {

    @Override public String getStepId() { return "STEP_08"; }
    @Override public int getStepNumber() { return 6; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                COLLECTED DATA:
                %s

                DECISION TREE — follow strictly, top to bottom, ask the FIRST missing field and STOP:
                → "occupants_count" missing → ask how many people (including themselves) will live in the property
                → "occupants_count" collected AND "has_pets" missing
                    → ask whether they have any pets (optional — accept any answer, including a non-answer)
                → ALL fields collected/asked → output a brief, warm confirmation sentence and stop.

                Rules:
                - If the user's answer does not provide the expected field, re-ask the SAME question once more.
                - has_pets is optional; do NOT block completion if the user does not answer it.
                - ALWAYS respond in %s.
                """.formatted(ctx.formattedData(), ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract household information from the user's message.
                Return ONLY a valid JSON object. Use null for fields not mentioned.

                Fields:
                - "occupants_count": integer (total people including tenant) or null
                - "has_pets": true/false or null

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        if (!ctx.hasData("has_pets")) {
            return ctx.isItalian()
                    ? List.of(new Suggestion("Sì, ho animali", "true"), new Suggestion("No animali", "false"))
                    : List.of(new Suggestion("Yes, I have pets", "true"), new Suggestion("No pets", "false"));
        }
        return List.of();
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("occupants_count", "N° occupanti", "Occupants", true),
                new ChecklistItem("has_pets",        "Animali",      "Pets",      false)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        // occupants_count is mandatory; has_pets is optional and only required to
        // have been asked at least once (tracked by the _asked_ marker).
        return ctx.hasData("occupants_count")
                && (ctx.hasData("has_pets") || ctx.hasData("_asked_has_pets"));
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_09"; }

    @Override
    public Optional<String> nextMissingField(OnboardingContext ctx) {
        if (!ctx.hasData("occupants_count")) return Optional.of("occupants_count");
        // has_pets: ask once; the service sets _asked_has_pets before streaming,
        // so on the very next turn this will return empty and the step will advance.
        if (!ctx.hasData("has_pets") && !ctx.hasData("_asked_has_pets")) return Optional.of("has_pets");
        return Optional.empty();
    }

    @Override
    public String fieldHint(String field, OnboardingContext ctx) {
        return switch (field) {
            case "occupants_count" -> "Ask how many people (including themselves) will live in the property. Example: '2'";
            case "has_pets"        -> "Ask whether they have any pets. This is optional — accept any answer including no answer.";
            default -> "Ask for: " + field;
        };
    }
}
