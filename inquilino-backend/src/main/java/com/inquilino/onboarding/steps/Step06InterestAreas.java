package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step06InterestAreas implements OnboardingStep {

    @Override public String getStepId() { return "STEP_06"; }
    @Override public int getStepNumber() { return 4; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                CURRENT GOAL: Collect the cities and areas where the tenant is looking for a home.

                Required fields:
                - interest_areas: list of cities or neighbourhoods (at least one)

                Data collected so far:
                %s

                Rules:
                - Ask which city/cities and neighbourhoods they prefer
                - Accept multiple areas (e.g. "Milano zona Navigli oppure Torino centro")
                - Store each area as an object {city, area} in the list
                - Once at least one area is collected, confirm warmly that this section is complete. Do NOT mention what comes next.
                - You can suggest popular Italian cities as examples if the user seems unsure
                - ALWAYS respond in %s
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
}
