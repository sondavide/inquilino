package com.inquilino.dto.landlord;

import com.inquilino.entity.LandlordProfile;

public record LandlordProfileDto(
        String id,
        String userId,
        String phone,
        String displayName,
        String agencyName,
        String vatNumber,
        String reaNumber,
        String websiteUrl,
        String contactMode,
        String contactPhone,
        String contactEmail,
        int profileCompletion
) {
    public static LandlordProfileDto from(LandlordProfile p) {
        String phone = p.getUser() != null ? p.getUser().getPhone() : null;
        return new LandlordProfileDto(
                p.getId().toString(),
                p.getUserId().toString(),
                phone,
                p.getDisplayName(),
                p.getAgencyName(),
                p.getVatNumber(),
                p.getReaNumber(),
                p.getWebsiteUrl(),
                p.getContactMode(),
                p.getContactPhone(),
                p.getContactEmail(),
                p.getProfileCompletion()
        );
    }
}
