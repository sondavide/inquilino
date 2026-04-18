package com.inquilino.dto.agency;

import com.inquilino.enums.AgencyStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record AgencyProfileResponse(
        UUID id,
        UUID userId,
        String agencyName,
        String vatNumber,
        String reaNumber,
        String websiteUrl,
        String contactEmail,
        String contactPhone,
        AgencyStatus status,
        String statusNote,
        List<Map<String, Object>> areas,
        LocalDateTime createdAt,
        LocalDateTime approvedAt
) {}
