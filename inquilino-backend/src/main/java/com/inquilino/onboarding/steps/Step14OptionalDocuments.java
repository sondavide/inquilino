package com.inquilino.onboarding.steps;

import com.inquilino.enums.DocumentType;
import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.Suggestion;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class Step14OptionalDocuments implements OnboardingStep {

    @Override public String getStepId() { return "STEP_14"; }
    @Override public int getStepNumber() { return 12; }
    @Override public boolean requiresDocumentUpload() { return true; }

    @Override
    public List<DocumentType> getExpectedDocumentTypes() {
        return List.of(DocumentType.LANDLORD_REFERENCE, DocumentType.BANK_STATEMENT);
    }

    @Override
    public String buildSystemPrompt(OnboardingContext ctx) {
        return """
                You are a warm, professional assistant building a tenant reliability profile.

                CURRENT GOAL: Offer the option to upload optional strengthening documents.

                Optional documents (each one improves the reliability score):
                - Landlord reference letter (referenza locatore precedente)
                - Bank statement (estratto conto bancario — proof of regular payments)
                - Employment contract (contratto di lavoro)

                Data collected so far:
                %s

                Rules:
                - Explain that these documents are optional but improve the profile significantly
                - If the tenant says they have them, guide the upload
                - If they say they don't have any OR they want to skip, acknowledge it kindly with one brief sentence and stop
                - IMPORTANT: whenever the user is done (uploaded what they have, or wants to skip), say explicitly "Procediamo con la verifica dei dati" so the system can move forward
                - ALWAYS respond in %s
                """.formatted(ctx.formattedData(), ctx.lang());
    }

    @Override
    public String buildExtractionPrompt(OnboardingContext ctx) {
        return """
                Determine if the user has finished with optional documents.
                Return ONLY a valid JSON object.

                Set "optional_docs_step_done": true if the user:
                - says they want to skip ("skip", "passo", "no grazie", "non ho documenti", "prosegui", "ho finito", "continua", "avanti")
                - confirms they're done uploading
                - says they don't have any optional documents
                Otherwise return {}
                """;
    }

    @Override
    public List<Suggestion> getSuggestions(OnboardingContext ctx) {
        return ctx.isItalian()
                ? List.of(new Suggestion("Ho documenti da caricare", "upload"), new Suggestion("Passo questo step", "skip"))
                : List.of(new Suggestion("I have documents to upload", "upload"), new Suggestion("Skip this step", "skip"));
    }

    @Override
    public List<ChecklistItem> getChecklistItems() {
        return List.of(
                new ChecklistItem("reference_uploaded",     "Referenza locatore", "Landlord reference", false),
                new ChecklistItem("bank_statement_uploaded","Estratto conto",     "Bank statement",     false)
        );
    }

    @Override
    public boolean isCompleted(OnboardingContext ctx) {
        // This step is always completable — either by uploading or by skipping
        return ctx.hasData("optional_docs_step_done");
    }

    @Override
    public String resolveNextStep(OnboardingContext ctx) { return "STEP_15"; }
}
