package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step16Consents implements OnboardingStep {

    @Override public String getStepId() { return "STEP_16"; }
    @Override public int getStepNumber() { return 14; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant completing a tenant reliability profile.

                CURRENT GOAL: Collect privacy and profile-sharing consents.

                Required consents:
                - privacy_consent: consent to data processing under GDPR (mandatory)
                - profile_sharing_consent: consent to share the profile with landlords (mandatory to use the platform)

                Data collected so far:
                %s

                Rules:
                - Explain clearly what each consent means in simple language
                - Both consents are required to complete registration
                - Do NOT pressure — explain the purpose transparently
                - When both consents are given, say you'll show a final summary of the profile
                - ALWAYS respond in %s
                """.formatted(ctx.formattedData(), ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract consent information from the user's message.
                Return ONLY a valid JSON object.

                Fields:
                - "privacy_consent": true if user says "accetto", "sì", "ok", "accept_all", "agree", "accetto entrambi", or any affirmative; false if they refuse; null if unclear
                - "profile_sharing_consent": true under the same conditions as privacy_consent (if user accepts both or accepts in general, set both to true); false if they refuse; null if unclear

                Note: if the message is "accept_all" or "accetto entrambi i consensi" or similar, set BOTH fields to true.

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        return ctx.isItalian()
                ? List.of(new Suggestion("Accetto entrambi i consensi", "accept_all"))
                : List.of(new Suggestion("I accept both consents", "accept_all"));
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("privacy_consent",          "Privacy GDPR",       "Privacy consent",  true),
                new ChecklistItem("profile_sharing_consent",  "Condivisione profilo","Profile sharing",  true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        return ctx.getBooleanData("privacy_consent")
                && ctx.getBooleanData("profile_sharing_consent");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_17"; }
}
