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

                FIRST MESSAGE ONLY (if no data has been collected yet): Before asking any questions, briefly
                inform the tenant that to complete the profile they will need:
                  1. An identity document (carta d'identità, passaporto, or patente)
                  2. Their Italian codice fiscale
                  3. At least one payslip (busta paga) or equivalent income document
                Tell them that if they don't have the payslip handy right now, they can still proceed and add it later.
                Then immediately start collecting the first required field (full_name).

                CURRENT GOAL: Collect the tenant's personal identity information.

                Required fields (collect ALL of them):
                - full_name: first and last name
                - birth_date: date of birth
                - birth_place: city and country/region of birth
                - residence: current full home address
                - fiscal_code: Italian codice fiscale (16 alphanumeric characters)

                Data collected so far:
                %s
                %s
                Rules:
                - Ask ONE field at a time (max 2 if closely related, e.g. birth city + birth country)
                - Skip fields already collected — acknowledge them and move on
                - Accept the fiscal_code exactly as the user provides it — do NOT attempt to validate it yourself
                - When ALL fields are collected, confirm warmly that the personal information is complete. Do NOT mention documents, next steps, or anything beyond this form.
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
