package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.FiscalCodeValidator;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

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
                DECISION TREE — follow strictly, top to bottom, ask the FIRST missing field and STOP.
                Include an example answer so the user knows exactly what format is expected.

                → "full_name" missing     → ask for their full name (first and last), e.g. "Mario Rossi"
                → "birth_date" missing    → ask for their date of birth in day/month/year format, e.g. 15/01/1990
                → "birth_country" missing → ask for their country of birth, e.g. "Italy" / "Italia"
                → "birth_city" missing    → ask for their city of birth, e.g. "Matera"
                → "residence" missing     → ask for their current home address, e.g. "Via Roma 1, Milano"
                → "fiscal_code" missing   → ask for their Italian fiscal code (codice fiscale), e.g. "RSSMRA90A15H501Z"
                → ALL collected           → output a brief, warm confirmation sentence and stop.

                Rules:
                - Ask ONE field at a time. Never bundle birth_country and birth_city in the same message.
                - If the user's answer does not provide the expected field, re-ask the SAME question once more.
                - Accept fiscal_code exactly as provided — do NOT validate it yourself.
                - ALWAYS respond in %s.
                """.formatted(ctx.formattedData(), cfNote, ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract identity information from the user's message.
                Return ONLY a valid JSON object. Use null for fields not mentioned.

                Fields:
                  "full_name"     (string)
                  "birth_date"    (YYYY-MM-DD or null)
                  "birth_country" (country name as a string, e.g. "Italia")
                  "birth_city"    (city name as a string, e.g. "Matera")
                  "residence"     (full address string, e.g. "Via Roma 1, Milano")
                  "fiscal_code"   (string, uppercase, exactly 16 characters — copy verbatim)

                IMPORTANT for fiscal_code: if the user's message IS a fiscal code \
                (16 alphanumeric characters), extract it verbatim even if it looks random.

                Return ONLY the JSON object, no markdown, no explanation.
                Example: {"full_name":"Mario Rossi","birth_date":"1990-01-15","birth_country":"Italia","birth_city":"Matera","residence":"Via Roma 1, Milano","fiscal_code":"RSSMRA90A15H501Z"}
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        return List.of(); // free-text step
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("full_name",     "Nome completo",      "Full name",        true),
                new ChecklistItem("birth_date",    "Data di nascita",    "Date of birth",    true),
                new ChecklistItem("birth_country", "Paese di nascita",   "Country of birth", true),
                new ChecklistItem("birth_city",    "Città di nascita",   "City of birth",    true),
                new ChecklistItem("residence",     "Residenza",          "Home address",     true),
                new ChecklistItem("fiscal_code",   "Codice fiscale",     "Fiscal code",      true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        if (!ctx.hasData("full_name")
                || !ctx.hasData("birth_date")
                || !ctx.hasData("birth_country")
                || !ctx.hasData("birth_city")
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

    @Override
    public Optional<String> nextMissingField(OnboardingContext ctx) {
        if (!ctx.hasData("full_name"))     return Optional.of("full_name");
        if (!ctx.hasData("birth_date"))    return Optional.of("birth_date");
        if (!ctx.hasData("birth_country")) return Optional.of("birth_country");
        if (!ctx.hasData("birth_city"))    return Optional.of("birth_city");
        if (!ctx.hasData("residence"))     return Optional.of("residence");
        // fiscal_code: missing OR present but invalid checksum
        if (!ctx.hasData("fiscal_code")) return Optional.of("fiscal_code");
        String cf = String.valueOf(ctx.data().get("fiscal_code"));
        if (!FiscalCodeValidator.isValid(cf)) return Optional.of("fiscal_code");
        return Optional.empty();
    }

    @Override
    public String fieldHint(String field, OnboardingContext ctx) {
        return switch (field) {
            case "full_name"     -> "Ask for their full name (first and last). Example: 'Mario Rossi'";
            case "birth_date"    -> "Ask for their date of birth in day/month/year format. Example: '15/01/1990'";
            case "birth_country" -> "Ask for their country of birth. Example: 'Italy'";
            case "birth_city"    -> "Ask for their city of birth. Example: 'Matera'";
            case "residence"     -> "Ask for their current home address. Example: 'Via Roma 1, Milano'";
            case "fiscal_code"   -> ctx.hasData("fiscal_code")
                    ? "The fiscal code '" + ctx.data().get("fiscal_code") + "' failed server-side checksum validation. " +
                      "Politely inform the user and ask them to re-enter it carefully."
                    : "Ask for their Italian fiscal code (codice fiscale). Example: 'RSSMRA90A15H501Z'";
            default -> "Ask for: " + field;
        };
    }
}
