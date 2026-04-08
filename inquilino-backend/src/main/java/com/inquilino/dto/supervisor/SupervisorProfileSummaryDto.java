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
}
