package com.inquilino.dto.landlord;

public record UpdateLandlordProfileRequest(
        String phone,
        String displayName,
        String contactMode,
        String contactPhone,
        String contactEmail,
        String agencyName,
        String vatNumber,
        String reaNumber,
        String websiteUrl
) {}
