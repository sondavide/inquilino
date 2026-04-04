package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step05HousingSituation implements OnboardingStep {

    @Override public String getStepId() { return "STEP_05"; }
    @Override public int getStepNumber() { return 3; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                CURRENT GOAL: Understand the tenant's current housing situation.

                Required fields:
                - current_housing_type: how they currently live (rent, own, with family, other)
                - pays_rent: boolean — whether they currently pay rent
                - desired_move_date: when they want to move (approximate date or timeframe)

                Data collected so far:
                %s

                Rules:
                - One question at a time
                - Skip already-collected fields
                - Accept natural answers (e.g. "in affitto" → pays_rent: true, current_housing_type: "rent")
                - When all 3 fields are collected, confirm and say you'll ask about areas of interest
                - ALWAYS respond in %s
                """.formatted(ctx.formattedData(), ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract housing situation data from the user's message.
                Return ONLY a valid JSON object. Use null for fields not mentioned.

                Fields:
                - "current_housing_type": one of "rent", "own", "family", "other" (or null)
                - "pays_rent": true/false (or null)
                - "desired_move_date": date string or natural language (or null)

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        if (!ctx.hasData("current_housing_type")) {
            return ctx.isItalian()
                    ? List.of(
                        new Suggestion("In affitto", "rent"),
                        new Suggestion("Di proprietà", "own"),
                        new Suggestion("Con la famiglia", "family"))
                    : List.of(
                        new Suggestion("Renting", "rent"),
                        new Suggestion("Own home", "own"),
                        new Suggestion("With family", "family"));
        }
        if (!ctx.hasData("pays_rent")) {
            return ctx.isItalian()
                    ? List.of(new Suggestion("Sì", "yes"), new Suggestion("No", "no"))
                    : List.of(new Suggestion("Yes", "yes"), new Suggestion("No", "no"));
        }
        return List.of();
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("current_housing_type", "Situazione attuale", "Current housing", true),
                new ChecklistItem("desired_move_date",    "Data trasloco",      "Move-in date",    true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        return ctx.hasData("current_housing_type") && ctx.hasData("desired_move_date");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_06"; }
}
