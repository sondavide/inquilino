package com.inquilino.controller;

import com.inquilino.dto.matching.ListingCardDto;
import com.inquilino.entity.*;
import com.inquilino.enums.MatchState;
import java.util.Arrays;
import com.inquilino.repository.*;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.MatchStateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * API matching lato inquilino.
 * Tutti gli endpoint richiedono autenticazione (TENANT).
 */
@RestController
@RequestMapping("/api/tenant/matches")
@RequiredArgsConstructor
public class TenantMatchController {

    private final MatchRepository         matchRepo;
    private final TenantProfileRepository profileRepo;
    private final ListingRepository       listingRepo;
    private final ListingMediaRepository  mediaRepo;
    private final LandlordProfileRepository landlordProfileRepo;
    private final MatchStateService       matchStateService;

    // ─── GET /api/tenant/matches ──────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<ListingCardDto>> getMatches(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        TenantProfile profile = profileRepo.findByUserId(principal.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        List<Match> matches = matchRepo.findActiveTenantMatches(profile.getId(), MatchState.ARCHIVED);

        List<ListingCardDto> result = matches.stream()
                .map(m -> buildCard(m, resolveLang(lang)))
                .toList();

        return ResponseEntity.ok(result);
    }

    // ─── GET /api/tenant/matches/mutual ──────────────────────────────────────

    @GetMapping("/mutual")
    public ResponseEntity<List<ListingCardDto>> getMutualMatches(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        TenantProfile profile = profileRepo.findByUserId(principal.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        List<Match> matches = matchRepo.findMutualTenantMatches(profile.getId(),
                Arrays.asList(MatchState.MUTUAL_INTEREST, MatchState.CONTACT_UNLOCKED));

        return ResponseEntity.ok(matches.stream()
                .map(m -> buildCard(m, resolveLang(lang)))
                .toList());
    }

    // ─── GET /api/tenant/matches/{matchId} ────────────────────────────────────

    @GetMapping("/{matchId}")
    public ResponseEntity<ListingCardDto> getMatch(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID matchId,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        TenantProfile profile = profileRepo.findByUserId(principal.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        Match match = matchRepo.findById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));

        if (!match.getTenantProfileId().equals(profile.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your match");
        }

        return ResponseEntity.ok(buildCard(match, resolveLang(lang)));
    }

    // ─── POST /api/tenant/matches/{matchId}/interest ──────────────────────────

    @PostMapping("/{matchId}/interest")
    public ResponseEntity<ListingCardDto> expressInterest(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID matchId,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        Match updated = matchStateService.tenantExpressInterest(matchId, principal.getUserId());
        return ResponseEntity.ok(buildCard(updated, resolveLang(lang)));
    }

    // ─── POST /api/tenant/matches/{matchId}/dismiss ───────────────────────────

    @PostMapping("/{matchId}/dismiss")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void dismiss(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID matchId) {
        matchStateService.tenantDismiss(matchId, principal.getUserId());
    }

    // ─── POST /api/tenant/matches/{matchId}/accept-invite ────────────────────

    @PostMapping("/{matchId}/accept-invite")
    public ResponseEntity<ListingCardDto> acceptInvite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID matchId,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        Match updated = matchStateService.tenantAcceptInvite(matchId, principal.getUserId());
        return ResponseEntity.ok(buildCard(updated, resolveLang(lang)));
    }

    // ─── POST /api/tenant/matches/{matchId}/unlock-contact ───────────────────

    @PostMapping("/{matchId}/unlock-contact")
    public ResponseEntity<ListingCardDto> unlockContact(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID matchId,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        Match updated = matchStateService.unlockContact(matchId, principal.getUserId());
        return ResponseEntity.ok(buildCard(updated, resolveLang(lang)));
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private ListingCardDto buildCard(Match match, String lang) {
        Listing listing = listingRepo.findById(match.getListingId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));

        List<ListingMedia> media = mediaRepo.findByListingIdOrderBySortOrderAsc(listing.getId());

        LandlordProfile landlordProfile = landlordProfileRepo.findByUserId(listing.getPublisherUserId())
                .orElse(null);

        return ListingCardDto.from(match, listing, media, landlordProfile, lang);
    }

    private String resolveLang(String acceptLang) {
        return acceptLang != null && acceptLang.startsWith("en") ? "en" : "it";
    }
}
