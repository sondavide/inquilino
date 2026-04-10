package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

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
                → "occupants_count" missing → ask: "Quante persone abiteranno nell'immobile, te incluso/a?"
                → "has_pets" missing        → ask: "Hai animali domestici?"
                → ALL collected             → output: "Ho tutte le informazioni sul nucleo familiare." and STOP.

                Rules:
                - If the user's answer does not provide the expected field, re-ask the SAME question once more.
                - ALWAYS respond in %s
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
        // has_pets is optional (required=false in checklist); occupants_count is mandatory.
        return ctx.hasData("occupants_count");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_09"; }
}
