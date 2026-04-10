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

                COLLECTED DATA:
                %s

                DECISION TREE — follow strictly, top to bottom, ask the FIRST missing field and STOP:

                → "employment_type" missing
                    → ask: "Qual è la tua attuale situazione lavorativa? (dipendente, autonomo/libero professionista, studente, pensionato, altro)"

                → employment_type = EMPLOYEE and "contract_type" missing
                    → ask: "Che tipo di contratto hai? (indeterminato, determinato, a progetto)"

                → employment_type in [EMPLOYEE, SELF_EMPLOYED] and "employment_start_date" missing
                    → ask: "Da quando lavori in questa posizione?"

                → employment_type in [STUDENT, RETIRED, OTHER]
                    → output one brief acknowledgment and STOP (no further fields needed)

                → ALL required fields collected
                    → output: "Ho tutte le informazioni sul tuo lavoro." and STOP.

                Rules:
                - If the user's answer does not provide the expected field, re-ask the SAME question once more.
                - Do NOT ask about income — that is handled in the next step.
                - Do NOT ask about job title, sector, or any detail not listed above.
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
