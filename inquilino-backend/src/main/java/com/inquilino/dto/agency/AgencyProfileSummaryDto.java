package com.inquilino.dto.agency;

import com.inquilino.enums.AgencyStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public record AgencyProfileSummaryDto(
        UUID id,
        UUID userId,
        String agencyName,
        String vatNumber,
        String contactEmail,
        AgencyStatus status,
        String statusNote,
        LocalDateTime createdAt,
        LocalDateTime approvedAt
) {}
