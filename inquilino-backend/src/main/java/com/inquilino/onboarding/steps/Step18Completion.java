package com.inquilino.onboarding.steps;

import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step18Completion implements OnboardingStep {

    @Override public String getStepId() { return "STEP_18"; }
    @Override public int getStepNumber() { return 15; }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant who has just completed a tenant reliability profile.

                CURRENT STATE: The profile has been submitted successfully.

                Rules:
                - Congratulate the tenant warmly in 2-3 sentences
                - Explain what happens next: the team will review uploaded documents and calculate the reliability score
                - IMPORTANT: clearly mention that if any information turns out to be wrong or incomplete, \
                  they can correct it at any time from their profile page — no need to redo the entire process
                - Explain that their profile is now visible to landlords on the platform
                - End with a single positive closing sentence — do NOT ask any question
                - ALWAYS respond in %s
                """.formatted(ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Return ONLY: {}
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) { return List.of(); }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("profile_submitted", "Profilo inviato", "Profile submitted", true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) { return true; } // terminal step

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_18"; } // stays here
}
