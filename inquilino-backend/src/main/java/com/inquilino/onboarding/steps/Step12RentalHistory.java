package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step12RentalHistory implements OnboardingStep {

    @Override public String getStepId() { return "STEP_12"; }
    @Override public int getStepNumber() { return 10; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                CURRENT GOAL: Gather rental history.

                Required fields:
                - had_previous_rentals: boolean — whether they have rented before
                - has_references: boolean — whether they have references from previous landlords
                  (only asked if had_previous_rentals is true)

                Data collected so far:
                %s

                Rules:
                - Ask if they have rented before
                - If YES: ask if they have a reference from a previous landlord; explain it strengthens the profile
                - If NO (first-time renter): do NOT ask about references — simply acknowledge and move on
                - Keep it brief — this is a yes/no section
                - When done, say you'll now ask for income documents
                - ALWAYS respond in %s
                """.formatted(ctx.formattedData(), ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract rental history from the user's message.
                Return ONLY a valid JSON object. Use null for fields not mentioned.

                Fields:
                - "had_previous_rentals": true/false or null
                - "has_references": true/false or null

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        if (!ctx.hasData("had_previous_rentals")) {
            return ctx.isItalian()
                    ? List.of(new Suggestion("Sì, ho già affittato", "true"), new Suggestion("No, prima volta", "false"))
                    : List.of(new Suggestion("Yes, rented before", "true"), new Suggestion("First time", "false"));
        }
        if (!ctx.hasData("has_references")) {
            return ctx.isItalian()
                    ? List.of(new Suggestion("Ho referenze", "true"), new Suggestion("Non ho referenze", "false"))
                    : List.of(new Suggestion("I have references", "true"), new Suggestion("No references", "false"));
        }
        return List.of();
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("had_previous_rentals","Storico affitti","Rental history", false),
                new ChecklistItem("has_references",      "Referenze",      "References",     false)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        if (!ctx.hasData("had_previous_rentals")) return false;
        boolean hadRentals = ctx.getBooleanData("had_previous_rentals");
        if (!hadRentals) return true; // first-time renter — no references needed
        return ctx.hasData("has_references");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_13"; }
}
