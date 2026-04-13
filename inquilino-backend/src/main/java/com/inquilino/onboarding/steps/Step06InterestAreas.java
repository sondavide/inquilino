package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class Step06InterestAreas implements OnboardingStep {

    @Override public String getStepId() { return "STEP_06"; }
    @Override public int getStepNumber() { return 4; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                COLLECTED DATA:
                %s

                DECISION TREE — follow strictly, top to bottom, ask the FIRST missing field and STOP:

                → "interest_areas" missing or empty
                    → ask which city or area they are looking to rent in (they can specify multiple cities or neighbourhoods)

                → "interest_areas" collected (at least one entry)
                    → output a brief, warm confirmation sentence and stop.

                Rules:
                - If the user's answer does not mention any city or area, re-ask the SAME question once more.
                - Accept multiple areas in one answer (e.g. "Milano Navigli or Torino city centre").
                - You may suggest popular Italian cities as examples if the user seems unsure.
                - ALWAYS respond in %s.
                """.formatted(ctx.formattedData(), ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract location preferences from the user's message.
                Return ONLY a valid JSON object.

                Field:
                - "interest_areas": array of objects like [{"city":"Milano","area":"Navigli"},{"city":"Torino","area":""}]
                  Return null if no location was mentioned.

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        if (!ctx.hasData("interest_areas")) {
            return List.of(
                    new Suggestion("Milano", "Milano"),
                    new Suggestion("Roma", "Roma"),
                    new Suggestion("Torino", "Torino"),
                    new Suggestion("Bologna", "Bologna"),
                    new Suggestion("Firenze", "Firenze"));
        }
        return List.of();
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("interest_areas", "Zone di interesse", "Areas of interest", true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        return ctx.hasData("interest_areas");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_07"; }

    @Override
    public Optional<String> nextMissingField(OnboardingContext ctx) {
        if (!ctx.hasData("interest_areas")) return Optional.of("interest_areas");
        return Optional.empty();
    }

    @Override
    public String fieldHint(String field, OnboardingContext ctx) {
        return "Ask which city or area(s) they are looking to rent in. They can specify multiple. Example: 'Milano, Navigli' or 'Torino'.";
    }
}
