package com.inquilino.dto.agency;

public record UpdateAgencyProfileRequest(
        String agencyName,
        String vatNumber,
        String reaNumber,
        String websiteUrl,
        String contactEmail,
        String contactPhone
) {}
