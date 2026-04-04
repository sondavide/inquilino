package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step09Employment implements OnboardingStep {

    @Override public String getStepId() { return "STEP_09"; }
    @Override public int getStepNumber() { return 7; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                CURRENT GOAL: Understand the tenant's employment situation.

                Required fields by employment type:
                - EMPLOYEE:      contract_type (permanent/fixed-term/project) + employment_start_date
                - SELF_EMPLOYED: employment_start_date only (NO contract_type — self-employed have no contract)
                - STUDENT / RETIRED / OTHER: no further fields needed

                Data collected so far:
                %s

                Rules:
                - First ask for employment type
                - EMPLOYEE: ask contract type, then start date
                - SELF_EMPLOYED: ask ONLY how long they have been self-employed (start date) — do NOT ask for contract type
                - STUDENT / RETIRED / OTHER: acknowledge and move on immediately
                - When required fields are collected, confirm and say you will now ask about income
                - Do NOT ask about income here — that is the next step
                - ALWAYS respond in %s
                """.formatted(ctx.formattedData(), ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract employment information from the user's message.
                Return ONLY a valid JSON object. Use null for fields not mentioned.

                Fields:
                - "employment_type": one of "EMPLOYEE","SELF_EMPLOYED","STUDENT","RETIRED","OTHER" or null
                - "contract_type": one of "permanent","fixed_term","project" or null
                - "employment_start_date": YYYY-MM-DD or natural text or null

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        if (!ctx.hasData("employment_type")) {
            return ctx.isItalian()
                    ? List.of(
                        new Suggestion("Dipendente", "EMPLOYEE"),
                        new Suggestion("Autonomo / Libero professionista", "SELF_EMPLOYED"),
                        new Suggestion("Studente", "STUDENT"),
                        new Suggestion("Pensionato", "RETIRED"),
                        new Suggestion("Altro", "OTHER"))
                    : List.of(
                        new Suggestion("Employee", "EMPLOYEE"),
                        new Suggestion("Self-employed", "SELF_EMPLOYED"),
                        new Suggestion("Student", "STUDENT"),
                        new Suggestion("Retired", "RETIRED"),
                        new Suggestion("Other", "OTHER"));
        }
        if (ctx.hasData("employment_type") && !ctx.hasData("contract_type")
                && "EMPLOYEE".equals(ctx.data().get("employment_type"))) {
            return ctx.isItalian()
                    ? List.of(
                        new Suggestion("Indeterminato", "permanent"),
                        new Suggestion("Determinato", "fixed_term"),
                        new Suggestion("A progetto", "project"))
                    : List.of(
                        new Suggestion("Permanent", "permanent"),
                        new Suggestion("Fixed-term", "fixed_term"),
                        new Suggestion("Project-based", "project"));
        }
        return List.of();
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("employment_type",       "Tipo lavoro",     "Employment type",  true),
                new ChecklistItem("contract_type",         "Tipo contratto",  "Contract type",    false),
                new ChecklistItem("employment_start_date", "Inizio lavoro",   "Start date",       false)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        if (!ctx.hasData("employment_type")) return false;
        String empType = String.valueOf(ctx.data().get("employment_type"));
        return switch (empType) {
            case "EMPLOYEE"      -> ctx.hasData("contract_type") && ctx.hasData("employment_start_date");
            case "SELF_EMPLOYED" -> ctx.hasData("employment_start_date");
            default              -> true; // STUDENT, RETIRED, OTHER — no further details needed
        };
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_10"; }
}
