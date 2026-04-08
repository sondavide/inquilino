package com.inquilino.dto.listing;

import com.inquilino.entity.Listing;
import com.inquilino.entity.ListingMedia;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ListingSummaryDto(
        UUID id,
        String listingType,
        String propertyType,
        String status,
        String title,
        String municipality,
        String district,
        BigDecimal monthlyRent,
        BigDecimal surfaceSqm,
        Integer roomsCount,
        String coverImageUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        int mediaCount,
        int flaggedFieldsCount
) {
    public static ListingSummaryDto from(Listing l, List<ListingMedia> media, int flaggedCount) {
        String coverUrl = media.stream()
                .filter(ListingMedia::isCover)
                .findFirst()
                .map(ListingMedia::getFileUrl)
                .orElse(media.isEmpty() ? null : media.get(0).getFileUrl());

        String municipality = l.getLocation() != null ? l.getLocation().getMunicipality() : null;
        String district     = l.getLocation() != null ? l.getLocation().getDistrict() : null;
        BigDecimal rent     = l.getPrice() != null ? l.getPrice().getMonthlyRent() : null;
        BigDecimal surface  = l.getFeatures() != null ? l.getFeatures().getSurfaceSqm() : null;
        Integer rooms       = l.getFeatures() != null ? l.getFeatures().getRoomsCount() : null;

        return new ListingSummaryDto(
                l.getId(),
                l.getListingType() != null ? l.getListingType().name() : null,
                l.getPropertyType() != null ? l.getPropertyType().name() : null,
                l.getStatus() != null ? l.getStatus().name() : null,
                l.getTitle(), municipality, district, rent, surface, rooms,
                coverUrl, l.getCreatedAt(), l.getUpdatedAt(),
                media.size(), flaggedCount
        );
    }
}
