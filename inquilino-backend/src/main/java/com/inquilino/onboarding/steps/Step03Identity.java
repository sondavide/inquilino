package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.FiscalCodeValidator;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step03Identity implements OnboardingStep {

    @Override public String getStepId() { return "STEP_03"; }
    @Override public int getStepNumber() { return 1; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        // If a fiscal code is present but fails checksum, inform the AI so it asks for re-entry
        String cfNote = "";
        if (ctx.hasData("fiscal_code")) {
            String cf = String.valueOf(ctx.data().get("fiscal_code"));
            if (!FiscalCodeValidator.isValid(cf)) {
                cfNote = """

                IMPORTANT: The fiscal_code currently saved ("%s") has failed the server-side checksum \
                validation. Politely inform the user that the code appears to be incorrect and ask them \
                to double-check and re-enter it. Do NOT accept the same value again.
                """.formatted(cf);
            }
        }

        return """
                You are a warm, professional assistant helping to build a tenant reliability profile for an Italian rental platform.

                FIRST MESSAGE ONLY (if no assistant messages exist yet): Briefly introduce the process:
                the tenant will need (1) an identity document, (2) their Italian codice fiscale,
                (3) at least one payslip or equivalent income document — the payslip can be added later.
                Then immediately ask for the first missing field below.

                COLLECTED DATA:
                %s
                %s
                DECISION TREE — follow strictly, top to bottom, ask the FIRST missing field and STOP:
                → "full_name" missing    → ask: "Qual è il tuo nome e cognome?"
                → "birth_date" missing   → ask: "Qual è la tua data di nascita?"
                → "birth_place" missing  → ask: "In quale città (e paese) sei nato/a?"
                → "residence" missing    → ask: "Qual è il tuo indirizzo di residenza attuale?"
                → "fiscal_code" missing  → ask: "Qual è il tuo codice fiscale italiano?"
                → ALL collected          → output: "Perfetto, ho tutte le informazioni personali." and STOP.

                Rules:
                - If the user's answer does not provide the expected field, re-ask the SAME question once more.
                - Accept fiscal_code exactly as provided — do NOT validate it yourself.
                - ALWAYS respond in %s
                """.formatted(ctx.formattedData(), cfNote, ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract identity information from the user's message.
                Return ONLY a valid JSON object. Use null for fields not mentioned.

                Fields: "full_name" (string), "birth_date" (YYYY-MM-DD or null),
                        "birth_place" (string), "residence" (string), "fiscal_code" (string)

                Return ONLY the JSON object, no markdown, no explanation.
                Example: {"full_name":"Mario Rossi","birth_date":"1990-01-15","birth_place":"Roma, Italia","residence":"Via Roma 1, Milano","fiscal_code":"RSSMRA90A15H501Z"}
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        return List.of(); // free-text step
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("full_name",    "Nome completo",    "Full name",       true),
                new ChecklistItem("birth_date",   "Data di nascita",  "Date of birth",   true),
                new ChecklistItem("birth_place",  "Luogo di nascita", "Place of birth",  true),
                new ChecklistItem("residence",    "Residenza",        "Home address",    true),
                new ChecklistItem("fiscal_code",  "Codice fiscale",   "Fiscal code",     true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        if (!ctx.hasData("full_name")
                || !ctx.hasData("birth_date")
                || !ctx.hasData("birth_place")
                || !ctx.hasData("residence")
                || !ctx.hasData("fiscal_code")) {
            return false;
        }
        // Server-side checksum validation — if invalid, keep the step open so the
        // AI can ask the user to re-enter it.
        String cf = String.valueOf(ctx.data().get("fiscal_code"));
        return FiscalCodeValidator.isValid(cf);
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_04"; }
}
