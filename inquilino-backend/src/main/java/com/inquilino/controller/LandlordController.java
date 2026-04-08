package com.inquilino.controller;

import com.inquilino.dto.landlord.LandlordProfileDto;
import com.inquilino.dto.landlord.UpdateLandlordProfileRequest;
import com.inquilino.dto.listing.*;
import com.inquilino.entity.LandlordProfile;
import com.inquilino.entity.ListingMedia;
import com.inquilino.entity.User;
import com.inquilino.repository.LandlordProfileRepository;
import com.inquilino.repository.UserRepository;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.ListingMediaService;
import com.inquilino.service.ListingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/landlord")
@RequiredArgsConstructor
public class LandlordController {

    private final ListingService         listingService;
    private final ListingMediaService    mediaService;
    private final LandlordProfileRepository profileRepo;
    private final UserRepository         userRepo;

    // ─── Profilo landlord ─────────────────────────────────────────────────────

    @GetMapping("/profile")
    public ResponseEntity<LandlordProfileDto> getProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        return profileRepo.findByUserIdWithUser(principal.getUserId())
                .map(LandlordProfileDto::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/profile")
    public ResponseEntity<LandlordProfileDto> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateLandlordProfileRequest req) {
        LandlordProfile profile = profileRepo.findByUserIdWithUser(principal.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (req.displayName()  != null) profile.setDisplayName(req.displayName());
        if (req.contactMode()  != null) profile.setContactMode(req.contactMode());
        if (req.contactPhone() != null) profile.setContactPhone(req.contactPhone());
        if (req.contactEmail() != null) profile.setContactEmail(req.contactEmail());
        if (req.agencyName()   != null) profile.setAgencyName(req.agencyName());
        if (req.vatNumber()    != null) profile.setVatNumber(req.vatNumber());
        if (req.reaNumber()    != null) profile.setReaNumber(req.reaNumber());
        if (req.websiteUrl()   != null) profile.setWebsiteUrl(req.websiteUrl());
        profileRepo.save(profile);

        if (req.phone() != null) {
            User user = userRepo.findById(principal.getUserId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            user.setPhone(req.phone());
            userRepo.save(user);
            profile.setUser(user);
        }

        return ResponseEntity.ok(LandlordProfileDto.from(profile));
    }

    // ─── Lista annunci del landlord ───────────────────────────────────────────

    @GetMapping("/listings")
    public List<ListingSummaryDto> getMyListings(
            @AuthenticationPrincipal UserPrincipal principal) {
        return listingService.getLandlordListings(principal.getUserId());
    }

    // ─── Crea annuncio (bozza) ────────────────────────────────────────────────

    @PostMapping("/listings")
    @ResponseStatus(HttpStatus.CREATED)
    public ListingResponse createListing(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody SaveListingRequest req) {
        var listing = listingService.createDraft(principal.getUserId(), req);
        return listingService.getListing(listing.getId(), principal.getUserId());
    }

    // ─── Dettaglio annuncio ───────────────────────────────────────────────────

    @GetMapping("/listings/{id}")
    public ListingResponse getListing(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return listingService.getListing(id, principal.getUserId());
    }

    // ─── Aggiorna annuncio (partial) ──────────────────────────────────────────

    @PutMapping("/listings/{id}")
    public ListingResponse updateListing(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody SaveListingRequest req) {
        listingService.update(id, principal.getUserId(), req);
        return listingService.getListing(id, principal.getUserId());
    }

    // ─── Invia in revisione ───────────────────────────────────────────────────

    @PostMapping("/listings/{id}/revert-to-draft")
    public Map<String, String> revertToDraft(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        var listing = listingService.revertToDraft(id, principal.getUserId());
        return Map.of("status", listing.getStatus().name());
    }

    @PostMapping("/listings/{id}/submit")
    public Map<String, String> submitForReview(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        var listing = listingService.submitForReview(id, principal.getUserId());
        return Map.of("status", listing.getStatus().name());
    }

    // ─── Media: upload ────────────────────────────────────────────────────────

    @PostMapping("/listings/{id}/media")
    @ResponseStatus(HttpStatus.CREATED)
    public ListingMediaDto uploadMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mediaType", defaultValue = "IMAGE") String mediaType) {

        ListingMedia media = mediaService.upload(id, principal.getUserId(), file, mediaType);
        return new ListingMediaDto(media.getId(), media.getMediaType(), media.getFileUrl(),
                media.getSortOrder(), media.isCover(), media.getUploadedAt());
    }

    // ─── Media: elimina ───────────────────────────────────────────────────────

    @DeleteMapping("/listings/{id}/media/{mediaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID mediaId) {
        mediaService.delete(id, mediaId, principal.getUserId());
    }

    // ─── Media: imposta copertina ─────────────────────────────────────────────

    @PatchMapping("/listings/{id}/media/{mediaId}/cover")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setCover(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID mediaId) {
        mediaService.setCover(id, mediaId, principal.getUserId());
    }

    // ─── Media: riordina ─────────────────────────────────────────────────────

    @PatchMapping("/listings/{id}/media/reorder")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorderMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody List<UUID> orderedIds) {
        mediaService.reorder(id, orderedIds, principal.getUserId());
    }

    // ─── Validazioni del landlord sui propri annunci ──────────────────────────

    @GetMapping("/listings/{id}/validations")
    public List<ListingFieldValidationDto> getValidations(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        // Verifica ownership
        listingService.getListing(id, principal.getUserId());
        // Deleghiamo al response già incluso nel getListing, ma espostiamo endpoint dedicato
        return listingService.getListing(id, principal.getUserId()).validations();
    }
}
