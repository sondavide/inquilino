package com.inquilino.dto.listing;

import com.inquilino.entity.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

public record ListingResponse(
        UUID id,
        String listingType,
        String propertyType,
        String publisherType,
        String status,
        String title,
        String description,
        String titleEn,
        String descriptionEn,
        String sourceLang,
        String internalReference,
        String slug,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime publishedAt,
        ListingLocationDto location,
        ListingPriceDto price,
        ListingFeaturesDto features,
        ListingAvailabilityDto availability,
        ListingEnergyDto energy,
        List<ListingMediaDto> media,
        ListingPublisherDto publisher,
        List<ListingFieldValidationDto> validations
) {
    public static ListingResponse from(Listing l, List<ListingMedia> media,
                                       List<ListingFieldValidation> validations,
                                       LandlordProfile publisherProfile) {

        ListingLocationDto locDto = null;
        if (l.getLocation() != null) {
            ListingLocation loc = l.getLocation();
            locDto = new ListingLocationDto(
                    loc.getCountryCode(), loc.getRegion(), loc.getProvince(),
                    loc.getMunicipality(), loc.getDistrict(), loc.getPostalCode(),
                    loc.getStreetName(), loc.getStreetNumber(), loc.getFullAddress(),
                    loc.getLocationPrecision() != null ? loc.getLocationPrecision().name() : null,
                    loc.getLocationPoint() != null ? loc.getLocationPoint().getY() : null,
                    loc.getLocationPoint() != null ? loc.getLocationPoint().getX() : null,
                    loc.getDisplayPoint() != null ? loc.getDisplayPoint().getY() : null,
                    loc.getDisplayPoint() != null ? loc.getDisplayPoint().getX() : null,
                    loc.getGeocodingProvider(), loc.getPlaceId()
            );
        }

        ListingPriceDto priceDto = null;
        if (l.getPrice() != null) {
            ListingPrice p = l.getPrice();
            priceDto = new ListingPriceDto(
                    p.getCurrency(), p.getMonthlyRent(), p.getWeeklyRent(), p.getDailyRent(),
                    p.getCondominiumFees(), p.isUtilitiesIncluded(), p.getUtilitiesEstimatedMonthly(),
                    p.getDepositMonths(), p.getDepositAmount(), p.getAgencyFeeAmount(),
                    p.getAgencyFeeNotes(), p.getOtherCostsNotes(), p.getPriceVisibility()
            );
        }

        ListingFeaturesDto featDto = null;
        if (l.getFeatures() != null) {
            ListingFeatures f = l.getFeatures();
            Map<String, Boolean> amenities = l.getAmenities() != null ? l.getAmenities().getAmenities() : Map.of();
            featDto = new ListingFeaturesDto(
                    f.getSurfaceSqm(), f.getCommercialSurfaceSqm(),
                    f.getRoomsCount(), f.getBedroomsCount(), f.getBathroomsCount(),
                    f.getFloorNumber(), f.getTotalBuildingFloors(),
                    f.isElevator(), f.getParkingSpacesCount(), f.isGarageIncluded(),
                    f.getBalconiesCount(), f.getTerracesCount(), f.getCellarsCount(),
                    f.getRoomType(), f.getRoomSurfaceSqm(),
                    f.getRoomFurnished(), f.getPrivateBathroom(), f.getSharedBathroom(),
                    f.getSharedKitchen(), f.getRoommatesCount(), f.isStudentsOnly(), amenities
            );
        }

        ListingAvailabilityDto availDto = null;
        if (l.getAvailability() != null) {
            ListingAvailability a = l.getAvailability();
            availDto = new ListingAvailabilityDto(
                    a.getConditionStatus(), a.getFurnishedStatus(), a.getKitchenStatus(),
                    a.getHeatingType(), a.getCoolingType(), a.getAvailabilityStatus(),
                    a.getAvailableFrom(), a.getAvailableTo(),
                    a.getMinimumContractDurationMonths(), a.getMaximumContractDurationMonths(),
                    a.getMinimumStayDays(), a.getMaximumStayDays(),
                    a.getMaxOccupants(), a.isPetsAllowed(), a.isSmokingAllowed(),
                    a.isChildrenAllowed(), a.isSublettingAllowed(), a.isResidenceAllowed(),
                    a.isStudentsAllowed(), a.isWorkersAllowed(), a.isShortStayAllowed(),
                    a.getNotesForTenants()
            );
        }

        ListingEnergyDto energyDto = null;
        if (l.getEnergy() != null) {
            ListingEnergy e = l.getEnergy();
            energyDto = new ListingEnergyDto(
                    e.getEnergyClass() != null ? e.getEnergyClass().name() : null,
                    e.getEnergyIndexEpgl(), e.isEnergyCertificateAvailable(),
                    e.getEnergyCertificateFileUrl(), e.getHeatingEnergySource(),
                    e.isRenewableEnergyPresent()
            );
        }

        List<ListingMediaDto> mediaDtos = media.stream()
                .map(m -> new ListingMediaDto(m.getId(), m.getMediaType(),
                        m.getFileUrl(), m.getSortOrder(), m.isCover(), m.getUploadedAt()))
                .collect(Collectors.toList());

        List<ListingFieldValidationDto> validationDtos = validations.stream()
                .map(ListingFieldValidationDto::from)
                .collect(Collectors.toList());

        ListingPublisherDto pubDto = null;
        if (publisherProfile != null) {
            pubDto = new ListingPublisherDto(
                    l.getPublisherType() != null ? l.getPublisherType().name() : null,
                    publisherProfile.getDisplayName(),
                    publisherProfile.getAgencyName(),
                    publisherProfile.getVatNumber(),
                    publisherProfile.getReaNumber(),
                    publisherProfile.getContactMode(),
                    publisherProfile.getContactPhone(),
                    publisherProfile.getContactEmail(),
                    publisherProfile.getWebsiteUrl()
            );
        }

        return new ListingResponse(
                l.getId(),
                l.getListingType() != null ? l.getListingType().name() : null,
                l.getPropertyType() != null ? l.getPropertyType().name() : null,
                l.getPublisherType() != null ? l.getPublisherType().name() : null,
                l.getStatus() != null ? l.getStatus().name() : null,
                l.getTitle(), l.getDescription(), l.getTitleEn(), l.getDescriptionEn(),
                l.getSourceLang(), l.getInternalReference(), l.getSlug(),
                l.getCreatedAt(), l.getUpdatedAt(), l.getPublishedAt(),
                locDto, priceDto, featDto, availDto, energyDto,
                mediaDtos, pubDto, validationDtos
        );
    }
}
