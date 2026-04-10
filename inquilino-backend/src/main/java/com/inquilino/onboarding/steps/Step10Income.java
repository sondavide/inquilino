package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step10Income implements OnboardingStep {

    @Override public String getStepId() { return "STEP_10"; }
    @Override public int getStepNumber() { return 8; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        Object budget = ctx.data().get("max_budget");
        String budgetHint = budget != null ? " (their stated max budget is " + budget + " EUR/month)" : "";
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                COLLECTED DATA:
                %s

                DECISION TREE — follow strictly, top to bottom, ask the FIRST missing field and STOP:

                → "monthly_income" missing
                    → ask: "Qual è il tuo reddito netto mensile in euro?"%s

                → "income_variability" missing
                    → ask: "Il tuo reddito è fisso, variabile, o al momento non hai reddito?"

                → ALL collected
                    → output: "Ho tutte le informazioni sul tuo reddito." and STOP.

                Rules:
                - If the user's answer does not provide the expected field, re-ask the SAME question once more.
                - Do NOT ask about savings, other income sources, or anything not listed above.
                - ALWAYS respond in %s
                """.formatted(ctx.formattedData(), budgetHint, ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract income information from the user's message.
                Return ONLY a valid JSON object. Use null for fields not mentioned.

                Fields:
                - "monthly_income": number (net EUR/month) or null. Set to 0 if user explicitly says they have no income.
                - "income_variability": one of "stable","variable","none" or null.
                  Use "none" if user has no income (student, unemployed, etc.).

                Note: if income_variability is "none", also set monthly_income to 0.

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        if (!ctx.hasData("income_variability")) {
            return ctx.isItalian()
                    ? List.of(
                        new Suggestion("Fisso", "stable"),
                        new Suggestion("Variabile", "variable"),
                        new Suggestion("Nessun reddito", "none"))
                    : List.of(
                        new Suggestion("Stable", "stable"),
                        new Suggestion("Variable", "variable"),
                        new Suggestion("No income", "none"));
        }
        return List.of();
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("monthly_income",    "Reddito mensile",  "Monthly income",    true),
                new ChecklistItem("income_variability","Stabilità reddito","Income stability",  true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        if (!ctx.hasData("income_variability")) return false;
        if ("none".equals(String.valueOf(ctx.data().get("income_variability")))) return true; // no income case
        return ctx.hasData("monthly_income");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_11"; }
}
