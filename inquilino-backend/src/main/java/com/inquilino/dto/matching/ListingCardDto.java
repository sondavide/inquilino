package com.inquilino.dto.matching;

import com.inquilino.entity.*;
import com.inquilino.enums.MatchState;
import com.inquilino.enums.PublisherType;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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

        // ─── Prezzo ───────────────────────────────────────────────────────────
        Double  monthlyRent,
        Double  dailyRent,
        Double  condominiumFees,
        boolean utilitiesIncluded,
        Double  utilitiesEstimatedMonthly,
        Integer depositMonths,
        Double  depositAmount,
        Double  agencyFeeAmount,
        String  agencyFeeNotes,

        // ─── Caratteristiche ──────────────────────────────────────────────────
        Double   surfaceSqm,
        Double   commercialSurfaceSqm,
        Integer  roomsCount,
        Integer  bedroomsCount,
        Integer  bathroomsCount,
        Integer  floorNumber,
        Integer  totalBuildingFloors,
        boolean  elevator,
        int      parkingSpacesCount,
        boolean  garageIncluded,
        int      balconiesCount,
        int      terracesCount,
        int      cellarsCount,

        // Room-specific
        String  roomType,
        Double  roomSurfaceSqm,
        Boolean privateBathroom,
        Boolean sharedBathroom,
        Boolean sharedKitchen,
        Integer roommatesCount,
        boolean studentsOnly,

        // ─── Stato / dotazioni ────────────────────────────────────────────────
        String conditionStatus,
        String furnishedStatus,
        String kitchenStatus,
        String heatingType,
        String coolingType,

        // Amenities (chiavi boolean, es. "washing_machine", "air_conditioning"…)
        Map<String, Boolean> amenities,

        // ─── Disponibilità ────────────────────────────────────────────────────
        String    availabilityStatus,
        LocalDate availableFrom,
        LocalDate availableTo,
        Integer   minimumContractDurationMonths,
        Integer   maximumContractDurationMonths,
        Integer   minimumStayDays,
        Integer   maximumStayDays,
        Integer   maxOccupants,
        boolean   petsAllowed,
        boolean   smokingAllowed,
        boolean   childrenAllowed,
        boolean   sublettingAllowed,
        boolean   residenceAllowed,
        boolean   studentsAllowed,
        boolean   workersAllowed,
        String    notesForTenants,

        // ─── Energia ──────────────────────────────────────────────────────────
        String  energyClass,
        Double  energyIndexEpgl,
        boolean energyCertificateAvailable,
        String  heatingEnergySource,
        boolean renewableEnergyPresent,

        // ─── Media / testi ────────────────────────────────────────────────────
        String       coverImageUrl,
        List<String> allImageUrls,
        String       description,

        // AI summary
        String matchSummary,
        String tenantMatchSummary,

        // ─── Contatti locatore — solo in CONTACT_UNLOCKED ────────────────────
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

        ListingLocation     loc   = listing.getLocation();
        ListingPrice        price = listing.getPrice();
        ListingAvailability avail = listing.getAvailability();
        ListingFeatures     feat  = listing.getFeatures();
        ListingEnergy       energy = listing.getEnergy();
        ListingAmenities    amen  = listing.getAmenities();

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
            // Se contactMode non è impostato (es. agenzia non ha configurato la preferenza),
            // esponi tutti i contatti disponibili.
            if (mode == null || "phone".equals(mode) || "mixed".equals(mode))
                contactPhone = landlordProfile.getContactPhone();
            if (mode == null || "email".equals(mode) || "mixed".equals(mode))
                contactEmail = landlordProfile.getContactEmail();
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

                // Localizzazione
                loc != null ? loc.getStreetName() : null,
                loc != null ? loc.getDistrict() : null,
                loc != null ? loc.getMunicipality() : null,
                loc != null && loc.getDisplayPoint() != null ? loc.getDisplayPoint().getY() : null,
                loc != null && loc.getDisplayPoint() != null ? loc.getDisplayPoint().getX() : null,

                // Coordinate esatte solo se unlocked
                unlocked && loc != null && loc.getLocationPoint() != null ? loc.getLocationPoint().getY() : null,
                unlocked && loc != null && loc.getLocationPoint() != null ? loc.getLocationPoint().getX() : null,
                unlocked && loc != null ? loc.getFullAddress() : null,

                // Prezzo
                price != null ? safeDouble(price.getMonthlyRent()) : null,
                price != null ? safeDouble(price.getDailyRent()) : null,
                price != null ? safeDouble(price.getCondominiumFees()) : null,
                price != null && price.isUtilitiesIncluded(),
                price != null ? safeDouble(price.getUtilitiesEstimatedMonthly()) : null,
                price != null ? price.getDepositMonths() : null,
                price != null ? safeDouble(price.getDepositAmount()) : null,
                price != null ? safeDouble(price.getAgencyFeeAmount()) : null,
                price != null ? price.getAgencyFeeNotes() : null,

                // Caratteristiche
                feat != null ? safeDouble(feat.getSurfaceSqm()) : null,
                feat != null ? safeDouble(feat.getCommercialSurfaceSqm()) : null,
                feat != null ? feat.getRoomsCount() : null,
                feat != null ? feat.getBedroomsCount() : null,
                feat != null ? feat.getBathroomsCount() : null,
                feat != null ? feat.getFloorNumber() : null,
                feat != null ? feat.getTotalBuildingFloors() : null,
                feat != null && feat.isElevator(),
                feat != null ? feat.getParkingSpacesCount() : 0,
                feat != null && feat.isGarageIncluded(),
                feat != null ? feat.getBalconiesCount() : 0,
                feat != null ? feat.getTerracesCount() : 0,
                feat != null ? feat.getCellarsCount() : 0,

                // Room-specific
                feat != null ? feat.getRoomType() : null,
                feat != null ? safeDouble(feat.getRoomSurfaceSqm()) : null,
                feat != null ? feat.getPrivateBathroom() : null,
                feat != null ? feat.getSharedBathroom() : null,
                feat != null ? feat.getSharedKitchen() : null,
                feat != null ? feat.getRoommatesCount() : null,
                feat != null && feat.isStudentsOnly(),

                // Stato / dotazioni
                avail != null ? avail.getConditionStatus() : null,
                avail != null ? avail.getFurnishedStatus() : null,
                avail != null ? avail.getKitchenStatus() : null,
                avail != null ? avail.getHeatingType() : null,
                avail != null ? avail.getCoolingType() : null,

                // Amenities
                amen != null ? amen.getAmenities() : java.util.Collections.emptyMap(),

                // Disponibilità
                avail != null ? avail.getAvailabilityStatus() : null,
                avail != null ? avail.getAvailableFrom() : null,
                avail != null ? avail.getAvailableTo() : null,
                avail != null ? avail.getMinimumContractDurationMonths() : null,
                avail != null ? avail.getMaximumContractDurationMonths() : null,
                avail != null ? avail.getMinimumStayDays() : null,
                avail != null ? avail.getMaximumStayDays() : null,
                avail != null ? avail.getMaxOccupants() : null,
                avail != null && avail.isPetsAllowed(),
                avail != null && avail.isSmokingAllowed(),
                avail == null || avail.isChildrenAllowed(),
                avail != null && avail.isSublettingAllowed(),
                avail == null || avail.isResidenceAllowed(),
                avail == null || avail.isStudentsAllowed(),
                avail == null || avail.isWorkersAllowed(),
                avail != null ? avail.getNotesForTenants() : null,

                // Energia
                energy != null && energy.getEnergyClass() != null ? energy.getEnergyClass().name() : null,
                energy != null ? safeDouble(energy.getEnergyIndexEpgl()) : null,
                energy != null && energy.isEnergyCertificateAvailable(),
                energy != null ? energy.getHeatingEnergySource() : null,
                energy != null && energy.isRenewableEnergyPresent(),

                // Media
                coverUrl,
                allUrls,
                desc,

                "en".equals(lang) && match.getMatchSummaryEn()       != null ? match.getMatchSummaryEn()       : match.getMatchSummary(),
                "en".equals(lang) && match.getTenantMatchSummaryEn() != null ? match.getTenantMatchSummaryEn() : match.getTenantMatchSummary(),

                // Contatti
                displayName,
                contactPhone,
                contactEmail
        );
    }

    /** Factory per annunci di agenzie (AgencyProfile invece di LandlordProfile). */
    public static ListingCardDto fromAgency(
            com.inquilino.entity.Match match,
            Listing listing,
            List<ListingMedia> media,
            com.inquilino.entity.AgencyProfile agencyProfile,
            String lang) {

        String contactPhone = null;
        String contactEmail = null;
        String displayName  = null;
        if (match.getMatchState() == MatchState.CONTACT_UNLOCKED && agencyProfile != null) {
            displayName  = agencyProfile.getAgencyName();
            contactPhone = agencyProfile.getContactPhone();
            contactEmail = agencyProfile.getContactEmail();
        }

        // Delegate all listing-level fields to the existing factory, passing a synthetic LandlordProfile
        // shell only for the contact block; override the contact fields after construction isn't possible
        // on a record, so we re-use the same full build with normalized contact values.
        ListingCardDto base = from(match, listing, media, null, lang);
        return new ListingCardDto(
                base.matchId(), base.matchState(), base.matchBand(), base.matchScore(),
                base.priceCompatible(), base.areaCompatible(), base.timingCompatible(),
                base.listingId(), base.listingType(), base.propertyType(), base.title(),
                base.streetName(), base.district(), base.municipality(),
                base.displayLat(), base.displayLng(),
                base.exactLat(), base.exactLng(), base.fullAddress(),
                base.monthlyRent(), base.dailyRent(), base.condominiumFees(),
                base.utilitiesIncluded(), base.utilitiesEstimatedMonthly(),
                base.depositMonths(), base.depositAmount(),
                base.agencyFeeAmount(), base.agencyFeeNotes(),
                base.surfaceSqm(), base.commercialSurfaceSqm(),
                base.roomsCount(), base.bedroomsCount(), base.bathroomsCount(),
                base.floorNumber(), base.totalBuildingFloors(), base.elevator(),
                base.parkingSpacesCount(), base.garageIncluded(),
                base.balconiesCount(), base.terracesCount(), base.cellarsCount(),
                base.roomType(), base.roomSurfaceSqm(), base.privateBathroom(),
                base.sharedBathroom(), base.sharedKitchen(), base.roommatesCount(), base.studentsOnly(),
                base.conditionStatus(), base.furnishedStatus(), base.kitchenStatus(),
                base.heatingType(), base.coolingType(), base.amenities(),
                base.availabilityStatus(), base.availableFrom(), base.availableTo(),
                base.minimumContractDurationMonths(), base.maximumContractDurationMonths(),
                base.minimumStayDays(), base.maximumStayDays(), base.maxOccupants(),
                base.petsAllowed(), base.smokingAllowed(), base.childrenAllowed(),
                base.sublettingAllowed(), base.residenceAllowed(),
                base.studentsAllowed(), base.workersAllowed(), base.notesForTenants(),
                base.energyClass(), base.energyIndexEpgl(), base.energyCertificateAvailable(),
                base.heatingEnergySource(), base.renewableEnergyPresent(),
                base.coverImageUrl(), base.allImageUrls(), base.description(),
                base.matchSummary(), base.tenantMatchSummary(),
                displayName, contactPhone, contactEmail
        );
    }

    private static Double safeDouble(java.math.BigDecimal bd) {
        return bd != null ? bd.doubleValue() : null;
    }
}
