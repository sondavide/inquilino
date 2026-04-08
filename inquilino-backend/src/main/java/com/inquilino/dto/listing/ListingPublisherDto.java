package com.inquilino.dto.listing;

public record ListingPublisherDto(
        String publisherType,
        String displayName,
        String agencyName,
        String vatNumber,
        String reaNumber,
        String contactMode,
        String contactPhone,
        String contactEmail,
        String websiteUrl
) {}
