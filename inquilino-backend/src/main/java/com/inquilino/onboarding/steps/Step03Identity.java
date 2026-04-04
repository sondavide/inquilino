package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
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

                Rules:
                - Ask ONE field at a time (max 2 if closely related, e.g. birth city + birth country)
                - Skip fields already collected — acknowledge them and move on
                - Validate the Italian fiscal code format (16 chars: LLLLLL99L99L999L)
                - If fiscal_code appears inconsistent with name/birth data, politely ask for clarification
                - When ALL fields are collected, confirm warmly and say you now need an identity document
                - ALWAYS respond in %s
                """.formatted(ctx.formattedData(), ctx.lang());
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
        return ctx.hasData("full_name")
                && ctx.hasData("birth_date")
                && ctx.hasData("birth_place")
                && ctx.hasData("residence")
                && ctx.hasData("fiscal_code");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_04"; }
}
