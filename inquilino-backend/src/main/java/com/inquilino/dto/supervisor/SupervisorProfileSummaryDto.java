package com.inquilino.dto.supervisor;

import com.inquilino.entity.TenantProfile;

import java.util.UUID;

public record SupervisorProfileSummaryDto(
        UUID profileId,
        UUID userId,
        String email,
        String fullName,
        String verificationStatus,
        int profileCompletion,
        UUID assignedSupervisorId
) {
    public static SupervisorProfileSummaryDto from(TenantProfile p) {
        return new SupervisorProfileSummaryDto(
                p.getId(),
                p.getUser().getId(),
                p.getUser().getEmail(),
                p.getFullName(),
                p.getVerificationStatus().name(),
                p.getProfileCompletion(),
                p.getAssignedSupervisorId()
        );
    }

    /** Use this variant to compute completion from the onboarding step (works for all statuses). */
    public static SupervisorProfileSummaryDto from(TenantProfile p, int stepNumber, int totalSteps) {
        int completion = totalSteps > 0
                ? (int) Math.round((double) stepNumber / totalSteps * 100)
                : 0;
        return new SupervisorProfileSummaryDto(
                p.getId(),
                p.getUser().getId(),
                p.getUser().getEmail(),
                p.getFullName(),
                p.getVerificationStatus().name(),
                completion,
                p.getAssignedSupervisorId()
        );
    }
}
