package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class Step11Guarantor implements OnboardingStep {

    @Override public String getStepId() { return "STEP_11"; }
    @Override public int getStepNumber() { return 9; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        boolean hasGuarantor = ctx.getBooleanData("has_guarantor");
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                COLLECTED DATA:
                %s

                DECISION TREE — follow strictly, top to bottom, ask the FIRST missing field and STOP:

                → "has_guarantor" missing
                    → ask whether they have a guarantor (a person who guarantees the rent)

                → has_guarantor = true and "guarantor_name" missing
                    → ask for the guarantor's full name

                → has_guarantor = true and "guarantor_income" missing
                    → ask for the guarantor's approximate net monthly income in EUR

                → has_guarantor = false
                    → output a brief acknowledgment that no guarantor was noted, then stop.

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
                Extract guarantor information from the user's message.
                Return ONLY a valid JSON object. Use null for fields not mentioned.

                Fields:
                - "has_guarantor": true/false or null
                - "guarantor_name": string or null
                - "guarantor_income": number (EUR/month) or null

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        if (!ctx.hasData("has_guarantor")) {
            return ctx.isItalian()
                    ? List.of(new Suggestion("Sì, ho un garante", "true"), new Suggestion("No, non ho garante", "false"))
                    : List.of(new Suggestion("Yes, I have a guarantor", "true"), new Suggestion("No guarantor", "false"));
        }
        return List.of();
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("has_guarantor",   "Garante",          "Guarantor",         false),
                new ChecklistItem("guarantor_name",  "Nome garante",     "Guarantor name",    false),
                new ChecklistItem("guarantor_income","Reddito garante",  "Guarantor income",  false)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        if (!ctx.hasData("has_guarantor")) return false;
        boolean hasGuarantor = ctx.getBooleanData("has_guarantor");
        if (!hasGuarantor) return true;
        return ctx.hasData("guarantor_name") && ctx.hasData("guarantor_income");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_12"; }

    @Override
    public Optional<String> nextMissingField(OnboardingContext ctx) {
        if (!ctx.hasData("has_guarantor")) return Optional.of("has_guarantor");
        if (!ctx.getBooleanData("has_guarantor")) return Optional.empty(); // no guarantor → done
        if (!ctx.hasData("guarantor_name"))   return Optional.of("guarantor_name");
        if (!ctx.hasData("guarantor_income")) return Optional.of("guarantor_income");
        return Optional.empty();
    }

    @Override
    public String fieldHint(String field, OnboardingContext ctx) {
        return switch (field) {
            case "has_guarantor"    -> "Ask whether they have a guarantor (a person who guarantees the rent payments). Yes/no.";
            case "guarantor_name"   -> "Ask for the guarantor's full name.";
            case "guarantor_income" -> "Ask for the guarantor's approximate net monthly income in EUR.";
            default -> "Ask for: " + field;
        };
    }
}
