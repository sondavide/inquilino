package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

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
                    → ask: "Hai un garante?"

                → has_guarantor = true and "guarantor_name" missing
                    → ask: "Come si chiama il tuo garante?"

                → has_guarantor = true and "guarantor_income" missing
                    → ask: "Qual è il reddito mensile netto approssimativo del garante?"

                → has_guarantor = false
                    → output: "Nessun garante — annotato." and STOP.

                → ALL required fields collected
                    → output: "Ho tutte le informazioni sul garante." and STOP.

                Rules:
                - If the user's answer does not provide the expected field, re-ask the SAME question once more.
                - ALWAYS respond in %s
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
}
