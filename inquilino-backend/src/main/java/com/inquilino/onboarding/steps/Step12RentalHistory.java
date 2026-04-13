package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class Step12RentalHistory implements OnboardingStep {

    @Override public String getStepId() { return "STEP_12"; }
    @Override public int getStepNumber() { return 10; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                COLLECTED DATA:
                %s

                DECISION TREE — follow strictly, top to bottom, ask the FIRST missing field and STOP:

                → "had_previous_rentals" missing
                    → ask whether they have rented before

                → had_previous_rentals = true and "has_references" missing
                    → ask whether they have a reference from a previous landlord (mention it strengthens the profile)

                → had_previous_rentals = false
                    → output a brief acknowledgment that this is their first rental experience, then stop.

                → ALL required fields collected
                    → output a brief, warm confirmation sentence and stop.

                Rules:
                - If the user's answer does not provide the expected field, re-ask the SAME question once more.
                - ALWAYS respond in %s.
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

    @Override
    public Optional<String> nextMissingField(OnboardingContext ctx) {
        if (!ctx.hasData("had_previous_rentals")) return Optional.of("had_previous_rentals");
        if (!ctx.getBooleanData("had_previous_rentals")) return Optional.empty(); // first-time renter → done
        if (!ctx.hasData("has_references")) return Optional.of("has_references");
        return Optional.empty();
    }

    @Override
    public String fieldHint(String field, OnboardingContext ctx) {
        return switch (field) {
            case "had_previous_rentals" -> "Ask whether they have rented a property before. Yes/no.";
            case "has_references"       -> "Ask whether they have a reference letter from a previous landlord. Mention it strengthens the profile.";
            default -> "Ask for: " + field;
        };
    }
}
