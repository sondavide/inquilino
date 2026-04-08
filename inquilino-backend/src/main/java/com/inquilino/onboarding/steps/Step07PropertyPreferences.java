package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step07PropertyPreferences implements OnboardingStep {

    @Override public String getStepId() { return "STEP_07"; }
    @Override public int getStepNumber() { return 5; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                CURRENT GOAL: Collect property preferences.

                Required fields:
                - max_budget: maximum monthly rent the tenant can afford (number in EUR)
                - property_type: type of property (apartment, studio, room, villa, other)
                - furnished_preference: "furnished", "unfurnished", or "no_preference"

                Data collected so far:
                %s

                Rules:
                - One question at a time
                - For max_budget, accept natural language (e.g. "non più di 900 euro") and extract the number
                - When all 3 fields are collected, confirm warmly that this section is complete. Do NOT mention what comes next.
                - ALWAYS respond in %s
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
}
