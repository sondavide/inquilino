package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class Step16Consents implements OnboardingStep {

    @Override public String getStepId() { return "STEP_16"; }
    @Override public int getStepNumber() { return 14; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        boolean privacyGiven  = ctx.getBooleanData("privacy_consent");
        boolean sharingGiven  = ctx.getBooleanData("profile_sharing_consent");
        boolean bothGiven     = privacyGiven && sharingGiven;

        String instruction;
        if (bothGiven) {
            instruction = "Both consents have already been collected. Output one brief confirmation sentence and the completion signal.";
        } else {
            String consent1 = ctx.isItalian()
                    ? "Trattamento dati personali (GDPR) — per gestire il profilo inquilino"
                    : "Personal data processing (GDPR) — to manage the tenant profile";
            String consent2 = ctx.isItalian()
                    ? "Condivisione del profilo — per renderlo visibile ai proprietari interessati"
                    : "Profile sharing — to make it visible to interested landlords";
            String buttonLabel = ctx.isItalian()
                    ? "Accetto entrambi i consensi"
                    : "I accept both consents";
            instruction = """
                    Ask the user to accept BOTH consents in a SINGLE message. \
                    Present them clearly but concisely:
                    1. %s
                    2. %s
                    Explain that both are required to use the platform. \
                    Offer the quick-reply button shown in the UI ("%s"). \
                    If the user refuses either consent, explain politely that without both consents \
                    the profile cannot be activated and ask again. \
                    Do NOT accept partial consent as complete. \
                    IMPORTANT: rule 5 (skip handling) does NOT apply here — \
                    these consents are mandatory and CANNOT be skipped."""
                    .formatted(consent1, consent2, buttonLabel);
        }

        return """
                You are a warm, professional assistant completing a tenant reliability profile.

                CURRENT GOAL: Collect privacy and profile-sharing consents.

                CONSENT STATUS:
                - privacy_consent: %s
                - profile_sharing_consent: %s

                INSTRUCTION:
                %s

                ALWAYS respond in %s.
                """.formatted(
                        privacyGiven  ? "✓ accepted" : "✗ missing",
                        sharingGiven  ? "✓ accepted" : "✗ missing",
                        instruction,
                        ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Extract consent information from the user's message.
                Return ONLY a valid JSON object.

                Fields:
                - "privacy_consent": true if the user accepts (any affirmative in Italian or English: \
                  "sì", "ok", "accetto", "accept_all", "agree", "accetto entrambi", "confermo", \
                  "i accept", "i agree", "yes", "i accept both", etc.); \
                  null if unclear or if the message is not about consents. Do NOT set to false.
                - "profile_sharing_consent": same rules as privacy_consent. \
                  If the user accepts in general ("accetto entrambi", "accept_all", "sì", "ok", "i accept both", "yes") set BOTH fields to true.

                IMPORTANT: Do NOT extract false values. If consent is not clearly given, return null for that field.
                Only set true when the user explicitly accepts.

                Return ONLY the JSON object, no markdown.
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        if (ctx.getBooleanData("privacy_consent") && ctx.getBooleanData("profile_sharing_consent")) {
            return List.of(); // both already accepted — no chip needed
        }
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

    @Override
    public Optional<String> nextMissingField(OnboardingContext ctx) {
        // Both consents are mandatory — keep returning until both are true
        if (!ctx.getBooleanData("privacy_consent") || !ctx.getBooleanData("profile_sharing_consent")) {
            return Optional.of("consents");
        }
        return Optional.empty();
    }

    @Override
    public String fieldHint(String field, OnboardingContext ctx) {
        return "Ask the user to accept BOTH privacy and profile-sharing consents in a single message. " +
               "Both are mandatory. If the user refuses either, explain politely and ask again.";
    }
}
