package com.inquilino.service;

import com.inquilino.dto.listing.*;
import com.inquilino.entity.*;
import com.inquilino.enums.*;
import com.inquilino.repository.*;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ListingService {

    private final ListingRepository              listingRepo;
    private final ListingLocationRepository      locationRepo;
    private final ListingMediaRepository         mediaRepo;
    private final ListingFieldValidationRepository fieldValidationRepo;
    private final ListingAuditLogRepository      auditLogRepo;
    private final LandlordProfileRepository      landlordProfileRepo;
    private final NotificationService            notificationService;
    private final ListingTranslationService      translationService;
    private final MatchingService                matchingService;

    private static final GeometryFactory GF = new GeometryFactory(new PrecisionModel(), 4326);

    // ─── Crea bozza ──────────────────────────────────────────────────────────

    @Transactional
    public Listing createDraft(UUID publisherUserId, SaveListingRequest req) {
        Listing listing = Listing.builder()
                .publisherUserId(publisherUserId)
                .listingType(req.listingType() != null ? ListingType.valueOf(req.listingType()) : null)
                .propertyType(req.propertyType() != null ? PropertyType.valueOf(req.propertyType()) : null)
                .publisherType(req.publisherType() != null ? PublisherType.valueOf(req.publisherType()) : null)
                .status(ListingStatus.DRAFT)
                .title(req.title())
                .description(req.description())
                .internalReference(req.internalReference())
                .sourceLang(req.sourceLang() != null ? req.sourceLang() : "it")
                .build();

        listing = listingRepo.save(listing);

        // Slug
        if (req.title() != null) {
            listing.setSlug(generateSlug(req.title(), listing.getId()));
            listing = listingRepo.save(listing);
        }

        applySubSections(listing, req);

        audit(listing.getId(), publisherUserId, "LANDLORD", ListingAuditAction.CREATED,
                null, null, ListingStatus.DRAFT.name(), null);

        return listing;
    }

    // ─── Aggiorna listing (partial) ───────────────────────────────────────────

    @Transactional
    public Listing update(UUID listingId, UUID publisherUserId, SaveListingRequest req) {
        Listing listing = getOwnedListing(listingId, publisherUserId);

        if (listing.getStatus() == ListingStatus.PUBLISHED
                || listing.getStatus() == ListingStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot edit a published or archived listing directly. Archive it first.");
        }

        if (req.listingType()  != null) listing.setListingType(ListingType.valueOf(req.listingType()));
        if (req.propertyType() != null) listing.setPropertyType(PropertyType.valueOf(req.propertyType()));
        if (req.publisherType()!= null) listing.setPublisherType(PublisherType.valueOf(req.publisherType()));
        if (req.title()        != null) {
            listing.setTitle(req.title());
            if (listing.getSlug() == null) {
                listing.setSlug(generateSlug(req.title(), listingId));
            }
        }
        if (req.description()        != null) listing.setDescription(req.description());
        if (req.internalReference()  != null) listing.setInternalReference(req.internalReference());
        if (req.sourceLang()         != null) listing.setSourceLang(req.sourceLang());

        applySubSections(listing, req);
        listingRepo.save(listing);

        audit(listingId, publisherUserId, "LANDLORD", ListingAuditAction.UPDATED,
                null, null, null, null);

        return listing;
    }

    // ─── Invia in revisione ───────────────────────────────────────────────────

    @Transactional
    public Listing submitForReview(UUID listingId, UUID publisherUserId) {
        Listing listing = getOwnedListing(listingId, publisherUserId);

        if (listing.getStatus() != ListingStatus.DRAFT
                && listing.getStatus() != ListingStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only DRAFT or REJECTED listings can be submitted for review");
        }

        validateMinimumFields(listing);

        listing.setStatus(ListingStatus.IN_REVIEW);
        listingRepo.save(listing);

        audit(listingId, publisherUserId, "LANDLORD",
                ListingAuditAction.SUBMITTED_FOR_REVIEW, null, null, ListingStatus.IN_REVIEW.name(), null);

        // Translate title+description into the other language asynchronously
        String srcLang    = listing.getSourceLang() != null ? listing.getSourceLang() : "it";
        String targetLang = "it".equals(srcLang) ? "en" : "it";
        translationService.translateAsync(listingId, srcLang, targetLang);

        return listing;
    }

    // ─── Riporta in bozza (da PUBLISHED) ─────────────────────────────────────

    @Transactional
    public Listing revertToDraft(UUID listingId, UUID publisherUserId) {
        Listing listing = getOwnedListing(listingId, publisherUserId);

        if (listing.getStatus() != ListingStatus.PUBLISHED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only PUBLISHED listings can be reverted to draft");
        }

        listing.setStatus(ListingStatus.DRAFT);
        listing.setPublishedAt(null);
        listingRepo.save(listing);

        audit(listingId, publisherUserId, "LANDLORD",
                ListingAuditAction.UPDATED, null, ListingStatus.PUBLISHED.name(), ListingStatus.DRAFT.name(),
                "Locatore ha riportato l'annuncio in bozza per modifiche");

        matchingService.archiveMatchesForListing(listingId);

        return listing;
    }

    // ─── Lista annunci del landlord ───────────────────────────────────────────

    public List<ListingSummaryDto> getLandlordListings(UUID publisherUserId) {
        List<Listing> listings = listingRepo.findByPublisherUserIdAndStatusNot(
                publisherUserId, ListingStatus.ARCHIVED);
        return listings.stream()
                .map(l -> {
                    List<ListingMedia> media = mediaRepo.findByListingIdOrderBySortOrderAsc(l.getId());
                    int flagged = fieldValidationRepo
                            .findByListingIdAndStatus(l.getId(), FieldValidationStatus.FLAGGED).size();
                    return ListingSummaryDto.from(l, media, flagged);
                })
                .toList();
    }

    // ─── Dettaglio singolo annuncio ───────────────────────────────────────────

    public ListingResponse getListing(UUID listingId, UUID publisherUserId) {
        Listing listing = getOwnedListing(listingId, publisherUserId);
        return buildResponse(listing);
    }

    public ListingResponse getListingById(UUID listingId) {
        Listing listing = listingRepo.findById(listingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
        return buildResponse(listing);
    }

    // ─── Annunci per supervisore ──────────────────────────────────────────────

    public List<ListingSummaryDto> getSupervisorQueue(List<ListingStatus> statuses) {
        return listingRepo.findByStatusIn(statuses).stream()
                .map(l -> {
                    List<ListingMedia> media = mediaRepo.findByListingIdOrderBySortOrderAsc(l.getId());
                    int flagged = fieldValidationRepo
                            .findByListingIdAndStatus(l.getId(), FieldValidationStatus.FLAGGED).size();
                    return ListingSummaryDto.from(l, media, flagged);
                })
                .toList();
    }

    public Page<ListingSummaryDto> getSupervisorQueuePaged(List<ListingStatus> statuses, Pageable pageable) {
        Page<Listing> page = listingRepo.findByStatusIn(statuses, pageable);
        List<ListingSummaryDto> content = page.getContent().stream()
                .map(l -> {
                    List<ListingMedia> media = mediaRepo.findByListingIdOrderBySortOrderAsc(l.getId());
                    int flagged = fieldValidationRepo
                            .findByListingIdAndStatus(l.getId(), FieldValidationStatus.FLAGGED).size();
                    return ListingSummaryDto.from(l, media, flagged);
                })
                .toList();
        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    // ─── Helpers privati ─────────────────────────────────────────────────────

    private Listing getOwnedListing(UUID listingId, UUID publisherUserId) {
        return listingRepo.findByIdAndPublisherUserId(listingId, publisherUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
    }

    private ListingResponse buildResponse(Listing listing) {
        List<ListingMedia>           media       = mediaRepo.findByListingIdOrderBySortOrderAsc(listing.getId());
        List<ListingFieldValidation> validations = fieldValidationRepo.findByListingId(listing.getId());
        LandlordProfile              profile     = landlordProfileRepo.findByUserId(listing.getPublisherUserId()).orElse(null);
        return ListingResponse.from(listing, media, validations, profile);
    }

    @Transactional
    private void applySubSections(Listing listing, SaveListingRequest req) {
        UUID lid = listing.getId();

        if (req.location() != null) {
            ListingLocationDto d = req.location();
            ListingLocation loc = locationRepo.findByListingId(lid)
                    .orElseGet(() -> ListingLocation.builder().listing(listing).build());
            loc.setCountryCode(nvl(d.countryCode(), loc.getCountryCode(), "IT"));
            loc.setRegion(d.region());
            loc.setProvince(d.province());
            loc.setMunicipality(d.municipality());
            loc.setDistrict(d.district());
            loc.setPostalCode(d.postalCode());
            loc.setStreetName(d.streetName());
            loc.setStreetNumber(d.streetNumber());
            loc.setFullAddress(d.fullAddress());
            if (d.locationPrecision() != null)
                loc.setLocationPrecision(LocationPrecision.valueOf(d.locationPrecision()));
            if (d.lat() != null && d.lng() != null)
                loc.setLocationPoint(makePoint(d.lng(), d.lat()));
            if (d.displayLat() != null && d.displayLng() != null)
                loc.setDisplayPoint(makePoint(d.displayLng(), d.displayLat()));
            else if (d.lat() != null && d.lng() != null)
                loc.setDisplayPoint(makePoint(d.lng(), d.lat())); // fallback: stessa posizione
            loc.setGeocodingProvider(d.geocodingProvider());
            loc.setPlaceId(d.placeId());
            locationRepo.save(loc);
            listing.setLocation(loc);
        }

        if (req.price() != null) {
            ListingPriceDto d = req.price();
            ListingPrice p = listing.getPrice() != null ? listing.getPrice()
                    : ListingPrice.builder().listing(listing).build();
            p.setCurrency(nvl(d.currency(), p.getCurrency(), "EUR"));
            p.setMonthlyRent(d.monthlyRent());
            p.setWeeklyRent(d.weeklyRent());
            p.setDailyRent(d.dailyRent());
            p.setCondominiumFees(d.condominiumFees());
            p.setUtilitiesIncluded(d.utilitiesIncluded());
            p.setUtilitiesEstimatedMonthly(d.utilitiesEstimatedMonthly());
            p.setDepositMonths(d.depositMonths());
            p.setDepositAmount(d.depositAmount());
            p.setAgencyFeeAmount(d.agencyFeeAmount());
            p.setAgencyFeeNotes(d.agencyFeeNotes());
            p.setOtherCostsNotes(d.otherCostsNotes());
            if (d.priceVisibility() != null) p.setPriceVisibility(d.priceVisibility());
            listing.setPrice(p);
        }

        if (req.features() != null) {
            ListingFeaturesDto d = req.features();
            ListingFeatures f = listing.getFeatures() != null ? listing.getFeatures()
                    : ListingFeatures.builder().listing(listing).build();
            f.setSurfaceSqm(d.surfaceSqm());
            f.setCommercialSurfaceSqm(d.commercialSurfaceSqm());
            f.setRoomsCount(d.roomsCount());
            f.setBedroomsCount(d.bedroomsCount());
            f.setBathroomsCount(d.bathroomsCount());
            f.setFloorNumber(d.floorNumber());
            f.setTotalBuildingFloors(d.totalBuildingFloors());
            f.setElevator(d.elevator());
            f.setParkingSpacesCount(d.parkingSpacesCount());
            f.setGarageIncluded(d.garageIncluded());
            f.setBalconiesCount(d.balconiesCount());
            f.setTerracesCount(d.terracesCount());
            f.setCellarsCount(d.cellarsCount());
            f.setRoomType(d.roomType());
            f.setRoomSurfaceSqm(d.roomSurfaceSqm());
            f.setRoomFurnished(d.roomFurnished());
            f.setPrivateBathroom(d.privateBathroom());
            f.setSharedBathroom(d.sharedBathroom());
            f.setSharedKitchen(d.sharedKitchen());
            f.setRoommatesCount(d.roommatesCount());
            f.setStudentsOnly(d.studentsOnly());
            listing.setFeatures(f);

            if (d.amenities() != null) {
                ListingAmenities am = listing.getAmenities() != null ? listing.getAmenities()
                        : ListingAmenities.builder().listing(listing).build();
                am.setAmenities(d.amenities());
                listing.setAmenities(am);
            }
        }

        if (req.availability() != null) {
            ListingAvailabilityDto d = req.availability();
            ListingAvailability a = listing.getAvailability() != null ? listing.getAvailability()
                    : ListingAvailability.builder().listing(listing).build();
            a.setConditionStatus(d.conditionStatus());
            a.setFurnishedStatus(d.furnishedStatus());
            a.setKitchenStatus(d.kitchenStatus());
            a.setHeatingType(d.heatingType());
            a.setCoolingType(d.coolingType());
            a.setAvailabilityStatus(d.availabilityStatus());
            a.setAvailableFrom(d.availableFrom());
            a.setAvailableTo(d.availableTo());
            a.setMinimumContractDurationMonths(d.minimumContractDurationMonths());
            a.setMaximumContractDurationMonths(d.maximumContractDurationMonths());
            a.setMinimumStayDays(d.minimumStayDays());
            a.setMaximumStayDays(d.maximumStayDays());
            a.setMaxOccupants(d.maxOccupants());
            a.setPetsAllowed(d.petsAllowed());
            a.setSmokingAllowed(d.smokingAllowed());
            a.setChildrenAllowed(d.childrenAllowed());
            a.setSublettingAllowed(d.sublettingAllowed());
            a.setResidenceAllowed(d.residenceAllowed());
            a.setStudentsAllowed(d.studentsAllowed());
            a.setWorkersAllowed(d.workersAllowed());
            a.setShortStayAllowed(d.shortStayAllowed());
            a.setNotesForTenants(d.notesForTenants());
            listing.setAvailability(a);
        }

        if (req.energy() != null) {
            ListingEnergyDto d = req.energy();
            ListingEnergy e = listing.getEnergy() != null ? listing.getEnergy()
                    : ListingEnergy.builder().listing(listing).build();
            if (d.energyClass() != null) e.setEnergyClass(EnergyClass.valueOf(d.energyClass()));
            e.setEnergyIndexEpgl(d.energyIndexEpgl());
            e.setEnergyCertificateAvailable(d.energyCertificateAvailable());
            e.setEnergyCertificateFileUrl(d.energyCertificateFileUrl());
            e.setHeatingEnergySource(d.heatingEnergySource());
            e.setRenewableEnergyPresent(d.renewableEnergyPresent());
            listing.setEnergy(e);
        }

        if (req.publisher() != null) {
            ListingPublisherDto d = req.publisher();
            LandlordProfile profile = landlordProfileRepo.findByUserId(listing.getPublisherUserId())
                    .orElseGet(() -> LandlordProfile.builder()
                            .userId(listing.getPublisherUserId()).build());
            if (d.displayName() != null)   profile.setDisplayName(d.displayName());
            if (d.agencyName()  != null)   profile.setAgencyName(d.agencyName());
            if (d.vatNumber()   != null)   profile.setVatNumber(d.vatNumber());
            if (d.reaNumber()   != null)   profile.setReaNumber(d.reaNumber());
            if (d.contactMode() != null)   profile.setContactMode(d.contactMode());
            if (d.contactPhone() != null)  profile.setContactPhone(d.contactPhone());
            if (d.contactEmail() != null)  profile.setContactEmail(d.contactEmail());
            if (d.websiteUrl()  != null)   profile.setWebsiteUrl(d.websiteUrl());
            landlordProfileRepo.save(profile);
        }

        listingRepo.save(listing);
    }

    private void validateMinimumFields(Listing listing) {
        List<String> missing = new java.util.ArrayList<>();
        if (listing.getTitle()        == null || listing.getTitle().isBlank())       missing.add("title");
        if (listing.getDescription()  == null || listing.getDescription().isBlank()) missing.add("description");
        if (listing.getListingType()  == null) missing.add("listingType");
        if (listing.getPropertyType() == null) missing.add("propertyType");

        if (listing.getLocation() == null || listing.getLocation().getLocationPoint() == null) {
            missing.add("location.locationPoint");
        }
        if (listing.getPrice() == null || listing.getPrice().getMonthlyRent() == null) {
            missing.add("price.monthlyRent");
        }
        if (listing.getAvailability() == null) missing.add("availability");
        if (listing.getEnergy() == null
                || listing.getEnergy().getEnergyClass() == null) {
            missing.add("energy.energyClass");
        }
        if (mediaRepo.countByListingId(listing.getId()) == 0) missing.add("media (almeno 1 foto)");

        if (!missing.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Campi obbligatori mancanti: " + String.join(", ", missing));
        }
    }

    private Point makePoint(double lng, double lat) {
        Point p = GF.createPoint(new Coordinate(lng, lat));
        p.setSRID(4326);
        return p;
    }

    private String generateSlug(String title, UUID id) {
        String base = Normalizer.normalize(title.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-");
        String candidate = base.length() > 80 ? base.substring(0, 80) : base;
        String slug = candidate + "-" + id.toString().substring(0, 8);
        return slug;
    }

    private void audit(UUID listingId, UUID actorId, String actorType,
                       ListingAuditAction action, String field,
                       String oldVal, String newVal, String note) {
        auditLogRepo.save(ListingAuditLog.builder()
                .listingId(listingId).actorId(actorId).actorType(actorType)
                .action(action).fieldName(field)
                .oldValue(oldVal).newValue(newVal).note(note)
                .build());
    }

    private static String nvl(String value, String existing, String defaultVal) {
        return value != null ? value : (existing != null ? existing : defaultVal);
    }
}
