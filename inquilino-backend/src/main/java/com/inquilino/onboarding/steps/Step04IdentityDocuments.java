package com.inquilino.onboarding.steps;

import com.inquilino.enums.DocumentType;
import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step04IdentityDocuments implements OnboardingStep {

    @Override public String getStepId() { return "STEP_04"; }
    @Override public int getStepNumber() { return 2; }
    @Override public boolean requiresDocumentUpload() { return true; }

    @Override
    public List<DocumentType> getExpectedDocumentTypes() {
        return List.of(DocumentType.IDENTITY);
    }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        boolean uploaded = ctx.hasData("identity_uploaded");
        boolean verified = ctx.getBooleanData("identity_verified");
        String note = uploaded && !verified
                ? String.valueOf(ctx.data().getOrDefault("identity_verification_note", ""))
                : "";

        String uploadStatus;
        if (!uploaded) {
            uploadStatus = "not yet";
        } else if (!verified) {
            uploadStatus = "uploaded but FAILED verification" + (note.isBlank() ? "" : ": " + note);
        } else {
            uploadStatus = "verified ✓";
        }

        // Choose exact response template based on current upload status
        String instruction = switch (uploadStatus.startsWith("uploaded but FAILED") ? "failed"
                : uploadStatus.equals("verified ✓") ? "verified" : "pending") {
            case "pending" -> """
                    Ask the user to upload their identity document using the 📎 attachment button.
                    Accepted: carta d'identità, passaporto, or patente di guida.
                    Do NOT mention verification — just ask for the upload.""";
            case "verified" -> """
                    The document has been verified successfully (status: verified ✓).
                    Acknowledge this briefly (e.g. "✓ Documento verificato.") and say you'll now ask about their housing situation.
                    Do NOT say "will verify" or "verification pending" — it is ALREADY done.""";
            case "failed" -> """
                    The document has ALREADY been verified and it FAILED (status: %s).
                    Communicate this result immediately: explain the reason and ask the user to use the 📎 button to upload a clearer, valid photo.
                    Do NOT say "will verify" or "I'll check" — the result is already known.""".formatted(uploadStatus);
            default -> "Ask for the identity document upload.";
        };

        return """
                You are a warm, professional assistant building a tenant reliability profile.

                CURRENT GOAL: Collect the tenant's identity document.

                Current upload status: %s

                INSTRUCTION FOR THIS RESPONSE:
                %s

                ALWAYS respond in %s.
                """.formatted(uploadStatus, instruction, ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        // Document upload is tracked by DocumentService, not by chat extraction
        return """
                The user may be talking about uploading an identity document.
                Return ONLY: {"identity_upload_intent": true} if they confirm they uploaded it, else {}
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        return List.of(); // upload action, no text chips needed
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("identity_uploaded", "Documento identità", "Identity document", true)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        return ctx.hasData("identity_uploaded") &&
               ctx.getBooleanData("identity_verified");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_05"; }
}
