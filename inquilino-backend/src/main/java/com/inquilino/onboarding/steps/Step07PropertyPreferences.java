package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class Step07PropertyPreferences implements OnboardingStep {

    @Override public String getStepId() { return "STEP_07"; }
    @Override public int getStepNumber() { return 5; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                COLLECTED DATA:
                %s

                DECISION TREE — follow strictly, top to bottom, ask the FIRST missing field and STOP:
                → "max_budget" missing           → ask for their maximum monthly rent budget (in EUR)
                → "property_type" missing        → ask what type of property they are looking for (apartment, studio, room, villa, other)
                → "furnished_preference" missing → ask whether they prefer furnished, unfurnished, or have no preference
                → ALL collected                  → output a brief, warm confirmation sentence and stop.

                Rules:
                - If the user's answer does not provide the expected field, re-ask the SAME question once more.
                - For max_budget: accept natural language like "no more than €900" and extract the number.
                - ALWAYS respond in %s.
                """.formatted(ctx.formattedData(), ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract property preferences from the user's message.
                Return ONLY a valid JSON object. Use null for fields not mentioned.

                Fields:
                - "max_budget": number (monthly EUR) or null
                - "property_type": one of "apartment","studio","room","villa","other" or null
                - "furnished_preference": one of "furnished","unfurnished","no_preference" or null

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        if (!ctx.hasData("property_type")) {
            return ctx.isItalian()
                    ? List.of(
                        new Suggestion("Appartamento", "apartment"),
                        new Suggestion("Monolocale", "studio"),
                        new Suggestion("Stanza", "room"))
                    : List.of(
                        new Suggestion("Apartment", "apartment"),
                        new Suggestion("Studio", "studio"),
                        new Suggestion("Room", "room"));
        }
        if (!ctx.hasData("furnished_preference")) {
            return ctx.isItalian()
                    ? List.of(
                        new Suggestion("Arredato", "furnished"),
                        new Suggestion("Non arredato", "unfurnished"),
                        new Suggestion("Indifferente", "no_preference"))
                    : List.of(
                        new Suggestion("Furnished", "furnished"),
                        new Suggestion("Unfurnished", "unfurnished"),
                        new Suggestion("No preference", "no_preference"));
        }
        return List.of();
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("max_budget",          "Budget massimo",    "Max budget",       true),
                new ChecklistItem("property_type",       "Tipo immobile",     "Property type",    true),
                new ChecklistItem("furnished_preference","Arredo",            "Furnished",        false)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        // All three fields must be collected before advancing so that suggestions
        // remain aligned with the bot's question (furnished preference is asked last).
        return ctx.hasData("max_budget")
                && ctx.hasData("property_type")
                && ctx.hasData("furnished_preference");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_08"; }

    @Override
    public Optional<String> nextMissingField(OnboardingContext ctx) {
        if (!ctx.hasData("max_budget"))           return Optional.of("max_budget");
        if (!ctx.hasData("property_type"))        return Optional.of("property_type");
        if (!ctx.hasData("furnished_preference")) return Optional.of("furnished_preference");
        return Optional.empty();
    }

    @Override
    public String fieldHint(String field, OnboardingContext ctx) {
        return switch (field) {
            case "max_budget"           -> "Ask for their maximum monthly rent budget in EUR. Example: '900'";
            case "property_type"        -> "Ask what type of property they are looking for: apartment, studio, room, villa, or other.";
            case "furnished_preference" -> "Ask whether they prefer furnished, unfurnished, or have no preference.";
            default -> "Ask for: " + field;
        };
    }
}
