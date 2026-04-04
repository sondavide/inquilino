package com.inquilino.dto.chat;

import com.inquilino.enums.DocumentType;
import com.inquilino.enums.StepStatus;
import com.inquilino.onboarding.Suggestion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class OnboardingStateDto {
    private String currentStep;
    private int stepNumber;
    private int totalSteps;
    private int progress;
    private StepStatus stepStatus;
    private List<Suggestion> suggestions;
    private List<ChecklistItemDto> checklistItems;
    private boolean requiresDocumentUpload;
    private List<DocumentType> expectedDocumentTypes;
    private String residenceAddress;
}
