package com.inquilino.dto.matching;

import com.inquilino.entity.*;
import com.inquilino.enums.MatchState;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Vista di un annuncio per l'inquilino.
 * I campi sensibili (civico, coordinate esatte, contatti locatore) sono
 * esposti solo quando matchState = CONTACT_UNLOCKED.
 */
public record ListingCardDto(
        UUID   matchId,
        String matchState,
        String matchBand,
        double matchScore,

        // Compatibilità badge
        boolean priceCompatible,
        boolean areaCompatible,
        boolean timingCompatible,

        // Dati annuncio
        UUID   listingId,
        String listingType,
        String propertyType,
        String title,
        Double monthlyRent,
        Double condominiumFees,
        boolean utilitiesIncluded,

        // Localizzazione (via senza civico o approssimata)
        String streetName,
        String district,
        String municipality,
        Double displayLat,
        Double displayLng,

        // Coordinate esatte — solo in CONTACT_UNLOCKED
        Double exactLat,
        Double exactLng,
        String fullAddress,

        // Caratteristiche
        Double   surfaceSqm,
        Integer  roomsCount,
        Integer  bedroomsCount,
        Integer  bathroomsCount,
        Integer  floorNumber,
        boolean  elevator,
        String   furnishedStatus,
        LocalDate availableFrom,
        boolean  petsAllowed,
        boolean  smokingAllowed,

        // Media
        String       coverImageUrl,
        List<String> allImageUrls,

        // Descrizione (lang-aware — il controller sceglie it/en)
        String description,

        // AI summary
        String matchSummary,

        // Contatti locatore — solo in CONTACT_UNLOCKED
        String landlordDisplayName,
        String landlordContactPhone,
        String landlordContactEmail
) {
    /**
     * Factory: costruisce il DTO applicando le regole di privacy per stato.
     */
    public static ListingCardDto from(
            com.inquilino.entity.Match match,
            Listing listing,
            List<ListingMedia> media,
            com.inquilino.entity.LandlordProfile landlordProfile,
            String lang) {

        ListingLocation loc  = listing.getLocation();
        ListingPrice    price = listing.getPrice();
        ListingAvailability avail = listing.getAvailability();
        ListingFeatures feat = listing.getFeatures();

        boolean unlocked = match.getMatchState() == MatchState.CONTACT_UNLOCKED;

        String coverUrl = media.stream()
                .filter(ListingMedia::isCover).findFirst()
                .or(() -> media.stream().findFirst())
                .map(ListingMedia::getFileUrl)
                .orElse(null);

        List<String> allUrls = media.stream()
                .map(ListingMedia::getFileUrl)
                .toList();

        String title = "en".equals(lang) && listing.getTitleEn() != null
                     ? listing.getTitleEn() : listing.getTitle();
        String desc  = "en".equals(lang) && listing.getDescriptionEn() != null
                     ? listing.getDescriptionEn() : listing.getDescription();

        // Contatti: esposti solo se unlocked e contactMode lo consente
        String contactPhone = null;
        String contactEmail = null;
        String displayName  = null;
        if (unlocked && landlordProfile != null) {
            displayName = landlordProfile.getDisplayName() != null
                        ? landlordProfile.getDisplayName()
                        : landlordProfile.getAgencyName();
            String mode = landlordProfile.getContactMode();
            if ("phone".equals(mode) || "mixed".equals(mode)) contactPhone = landlordProfile.getContactPhone();
            if ("email".equals(mode) || "mixed".equals(mode)) contactEmail = landlordProfile.getContactEmail();
        }

        return new ListingCardDto(
                match.getId(),
                match.getMatchState().name(),
                match.getMatchBand() != null ? match.getMatchBand().name() : null,
                match.getMatchScoreTenant() != null ? match.getMatchScoreTenant() : 0,

                match.isPriceMatch(),
                match.isGeoMatch(),
                match.isTimingMatch(),

                listing.getId(),
                listing.getListingType().name(),
                listing.getPropertyType().name(),
                title,
                price != null ? safeDouble(price.getMonthlyRent()) : null,
                price != null ? safeDouble(price.getCondominiumFees()) : null,
                price != null && price.isUtilitiesIncluded(),

                loc != null ? loc.getStreetName() : null,
                loc != null ? loc.getDistrict() : null,
                loc != null ? loc.getMunicipality() : null,
                loc != null && loc.getDisplayPoint() != null ? loc.getDisplayPoint().getY() : null,
                loc != null && loc.getDisplayPoint() != null ? loc.getDisplayPoint().getX() : null,

                // Coordinate esatte solo se unlocked
                unlocked && loc != null && loc.getLocationPoint() != null ? loc.getLocationPoint().getY() : null,
                unlocked && loc != null && loc.getLocationPoint() != null ? loc.getLocationPoint().getX() : null,
                unlocked && loc != null ? loc.getFullAddress() : null,

                feat != null ? safeDouble(feat.getSurfaceSqm()) : null,
                feat != null ? feat.getRoomsCount() : null,
                feat != null ? feat.getBedroomsCount() : null,
                feat != null ? feat.getBathroomsCount() : null,
                feat != null ? feat.getFloorNumber() : null,
                feat != null && feat.isElevator(),
                avail != null ? avail.getFurnishedStatus() : null,
                avail != null ? avail.getAvailableFrom() : null,
                avail != null && avail.isPetsAllowed(),
                avail != null && avail.isSmokingAllowed(),

                coverUrl,
                allUrls,
                desc,

                match.getMatchSummary(),

                displayName,
                contactPhone,
                contactEmail
        );
    }

    private static Double safeDouble(java.math.BigDecimal bd) {
        return bd != null ? bd.doubleValue() : null;
    }
}
