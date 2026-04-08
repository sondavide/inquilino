package com.inquilino.dto.listing;

public record ListingLocationDto(
        String countryCode,
        String region,
        String province,
        String municipality,
        String district,
        String postalCode,
        String streetName,
        String streetNumber,
        String fullAddress,
        String locationPrecision,
        Double lat,
        Double lng,
        Double displayLat,
        Double displayLng,
        String geocodingProvider,
        String placeId
) {}
