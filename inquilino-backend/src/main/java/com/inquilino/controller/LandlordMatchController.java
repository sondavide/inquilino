package com.inquilino.controller;

import com.inquilino.dto.matching.TenantProfileCardDto;
import com.inquilino.dto.tenant.ScoreDto;
import com.inquilino.entity.*;
import com.inquilino.enums.MatchState;
import java.util.Arrays;
import com.inquilino.repository.*;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.MatchStateService;
import com.inquilino.service.ScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * API matching lato locatore.
 * Tutti gli endpoint richiedono ruolo LANDLORD/AGENCY/SUPERADMIN.
 */
@RestController
@RequestMapping("/api/landlord/listings/{listingId}/matches")
@RequiredArgsConstructor
public class LandlordMatchController {

    private final MatchRepository         matchRepo;
    private final ListingRepository       listingRepo;
    private final TenantProfileRepository profileRepo;
    private final DocumentRepository      documentRepo;
    private final UserRepository          userRepository;
    private final ScoringService          scoringService;
    private final MatchStateService       matchStateService;

    // ─── GET /api/landlord/listings/{listingId}/matches ───────────────────────

    @GetMapping
    public ResponseEntity<Page<TenantProfileCardDto>> getMatches(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listingId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        assertListingOwner(listingId, principal.getUserId());

        Page<Match> matchPage = matchRepo.findActiveListingMatches(
                listingId, MatchState.ARCHIVED, PageRequest.of(page, size));

        List<TenantProfileCardDto> content = matchPage.getContent().stream()
                .map(m -> buildCard(m, resolveLang(lang)))
                .toList();

        return ResponseEntity.ok(new PageImpl<>(content, matchPage.getPageable(), matchPage.getTotalElements()));
    }

    // ─── GET …/mutual ────────────────────────────────────────────────────────

    @GetMapping("/mutual")
    public ResponseEntity<List<TenantProfileCardDto>> getMutualMatches(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listingId,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        assertListingOwner(listingId, principal.getUserId());

        List<Match> matches = matchRepo.findMutualListingMatches(listingId,
                Arrays.asList(MatchState.MUTUAL_INTEREST, MatchState.CONTACT_UNLOCKED));

        return ResponseEntity.ok(matches.stream().map(m -> buildCard(m, resolveLang(lang))).toList());
    }

    // ─── GET /api/landlord/listings/{listingId}/matches/{matchId} ────────────

    @GetMapping("/{matchId}")
    public ResponseEntity<TenantProfileCardDto> getMatch(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listingId,
            @PathVariable UUID matchId,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        assertListingOwner(listingId, principal.getUserId());

        Match match = matchRepo.findById(matchId)
                .filter(m -> m.getListingId().equals(listingId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));

        return ResponseEntity.ok(buildCard(match, resolveLang(lang)));
    }

    // ─── POST …/interest ─────────────────────────────────────────────────────

    @PostMapping("/{matchId}/interest")
    public ResponseEntity<TenantProfileCardDto> expressInterest(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listingId,
            @PathVariable UUID matchId,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        assertListingOwner(listingId, principal.getUserId());
        Match updated = matchStateService.landlordExpressInterest(matchId, principal.getUserId());
        return ResponseEntity.ok(buildCard(updated, resolveLang(lang)));
    }

    // ─── POST …/invite ────────────────────────────────────────────────────────

    @PostMapping("/{matchId}/invite")
    public ResponseEntity<TenantProfileCardDto> invite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listingId,
            @PathVariable UUID matchId,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        assertListingOwner(listingId, principal.getUserId());
        Match updated = matchStateService.landlordInvite(matchId, principal.getUserId());
        return ResponseEntity.ok(buildCard(updated, resolveLang(lang)));
    }

    // ─── POST …/dismiss ──────────────────────────────────────────────────────

    @PostMapping("/{matchId}/dismiss")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void dismiss(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listingId,
            @PathVariable UUID matchId) {

        assertListingOwner(listingId, principal.getUserId());
        matchStateService.landlordDismiss(matchId, principal.getUserId());
    }

    // ─── POST …/unlock-contact ────────────────────────────────────────────────

    @PostMapping("/{matchId}/unlock-contact")
    public ResponseEntity<TenantProfileCardDto> unlockContact(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listingId,
            @PathVariable UUID matchId,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        assertListingOwner(listingId, principal.getUserId());
        Match updated = matchStateService.unlockContact(matchId, principal.getUserId());
        return ResponseEntity.ok(buildCard(updated, resolveLang(lang)));
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private TenantProfileCardDto buildCard(Match match, String lang) {
        TenantProfile profile = profileRepo.findById(match.getTenantProfileId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        User user = userRepository.findById(profile.getUser().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        List<Document> docs = documentRepo.findByUserId(user.getId());
        ScoreDto score = scoringService.calculate(profile, docs);

        return TenantProfileCardDto.from(
                match, profile, user,
                score.rentSustainability(),
                score.incomeStability(),
                score.documentReliability(),
                lang);
    }

    private String resolveLang(String acceptLang) {
        return acceptLang != null && acceptLang.startsWith("en") ? "en" : "it";
    }

    private void assertListingOwner(UUID listingId, UUID userId) {
        listingRepo.findByIdAndPublisherUserId(listingId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Listing not found or not owned by you"));
    }
}
