package com.inquilino.onboarding.steps;

import com.inquilino.enums.DocumentType;
import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step13IncomeDocuments implements OnboardingStep {

    @Override public String getStepId() { return "STEP_13"; }
    @Override public int getStepNumber() { return 11; }
    @Override public boolean requiresDocumentUpload() { return true; }

    @Override
    public List<DocumentType> getExpectedDocumentTypes() {
        return List.of(DocumentType.PAYSLIP, DocumentType.TAX_RETURN, DocumentType.GUARANTOR_DOCUMENT);
    }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        String empType = String.valueOf(ctx.data().getOrDefault("employment_type", "EMPLOYEE"));
        String docNeeded = switch (empType) {
            case "SELF_EMPLOYED" -> "last 2 years' tax returns (dichiarazione dei redditi)";
            case "STUDENT"       -> "guarantor's income documents (buste paga o dichiarazione dei redditi del garante)";
            default              -> "last 3 payslips (buste paga)";
        };
        boolean payslipUploaded   = ctx.hasData("payslip_uploaded");
        boolean taxReturnUploaded = ctx.hasData("tax_return_uploaded");
        boolean payslipVerified   = ctx.getBooleanData("payslip_verified");
        boolean taxReturnVerified = ctx.getBooleanData("tax_return_verified");

        String verificationStatus = "";
        if (payslipUploaded && !payslipVerified) {
            String note = String.valueOf(ctx.data().getOrDefault("payslip_verification_note", ""));
            verificationStatus += "\n- Payslip FAILED verification" + (note.isBlank() ? "" : ": " + note);
        }
        if (taxReturnUploaded && !taxReturnVerified) {
            String note = String.valueOf(ctx.data().getOrDefault("tax_return_verification_note", ""));
            verificationStatus += "\n- Tax return FAILED verification" + (note.isBlank() ? "" : ": " + note);
        }

        // Determine what happened most recently
        String immediateInstruction;
        if (!verificationStatus.isBlank()) {
            immediateInstruction = """
                    IMPORTANT: One or more documents have ALREADY been verified and FAILED (see Verification issues below).
                    Communicate this result NOW — do NOT say "will verify" or "I'll check".
                    Explain the reason and ask the user to re-upload a clearer, valid photo using the 📎 button.""";
        } else if (ctx.hasData("payslip_uploaded") || ctx.hasData("tax_return_uploaded") || ctx.hasData("guarantor_document_uploaded")) {
            immediateInstruction = "A document was uploaded and verified ✓. Confirm this briefly. If more income documents are needed, ask for them; otherwise output one brief confirmation sentence and stop.";
        } else {
            immediateInstruction = "Ask the user to upload the required income document(s) using the 📎 button. Do NOT mention verification — just request the upload.";
        }

        return """
                You are a warm, professional assistant building a tenant reliability profile.

                CURRENT GOAL: Collect income documents.

                The tenant is: %s
                Documents needed: %s
                Verification issues:%s

                Data collected so far:
                %s

                INSTRUCTION FOR THIS RESPONSE:
                %s

                ALWAYS respond in %s.
                """.formatted(empType, docNeeded,
                        verificationStatus.isBlank() ? " none" : verificationStatus,
                        ctx.formattedData(), immediateInstruction, ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Return ONLY: {} (income documents are tracked by the upload system, not by chat)
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) { return List.of(); }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("payslip_uploaded",    "Buste paga",         "Payslips",         false),
                new ChecklistItem("tax_return_uploaded", "Dichiarazione redditi","Tax return",     false)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        boolean payslipOk   = ctx.hasData("payslip_uploaded")            && ctx.getBooleanData("payslip_verified");
        boolean taxReturnOk = ctx.hasData("tax_return_uploaded")          && ctx.getBooleanData("tax_return_verified");
        boolean guarantorOk = ctx.hasData("guarantor_document_uploaded")  && ctx.getBooleanData("guarantor_document_verified");
        return payslipOk || taxReturnOk || guarantorOk;
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_14"; }
}
