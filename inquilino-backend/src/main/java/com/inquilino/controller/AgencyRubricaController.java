package com.inquilino.controller;

import com.inquilino.dto.matching.TenantProfileCardDto;
import com.inquilino.dto.tenant.ScoreDto;
import com.inquilino.entity.*;
import com.inquilino.enums.MatchState;
import com.inquilino.repository.*;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.AgencyService;
import com.inquilino.service.ScoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Rubrica dell'agenzia: profili interessati agli annunci dell'agenzia.
 * Un profilo appare nella rubrica quando mette like a un annuncio PUBLISHED dell'agenzia.
 * Sparisce quando tutti gli annunci a cui ha messo like sono disattivati.
 */
@RestController
@RequestMapping("/api/agency/rubrica")
@RequiredArgsConstructor
public class AgencyRubricaController {

    private static final List<MatchState> INTERESTED_STATES =
            List.of(MatchState.TENANT_INTERESTED, MatchState.CONTACT_UNLOCKED);

    private final MatchRepository         matchRepo;
    private final TenantProfileRepository profileRepo;
    private final DocumentRepository      documentRepo;
    private final UserRepository          userRepository;
    private final ListingRepository       listingRepo;
    private final ScoringService          scoringService;
    private final AgencyService           agencyService;

    /**
     * Tutti i profili unici che hanno messo like ad almeno un annuncio PUBLISHED dell'agenzia.
     * Risponde sia per AGENCY che per AGENCY_OPERATOR (scope non filtrato qui, visibilità globale).
     */
    @GetMapping
    public List<TenantProfileCardDto> getRubrica(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        UUID agencyUserId = agencyService.resolvePublisherUserId(
                principal.getUserId(), principal.getUserType());

        List<Match> matches = matchRepo.findAgencyRubrica(agencyUserId, INTERESTED_STATES);

        // Deduplica per tenantProfileId: mostra il profilo una volta, anche se ha messo like a più annunci
        return matches.stream()
                .collect(java.util.stream.Collectors.toMap(
                        Match::getTenantProfileId,
                        m -> m,
                        (existing, newer) -> existing)) // mantieni il più vecchio (prima volta che si è mostrato)
                .values().stream()
                .map(m -> buildCard(m, resolveLang(lang)))
                .toList();
    }

    /**
     * Profili interessati a un annuncio specifico dell'agenzia.
     * Per gli AGENCY_OPERATOR verifica lo scope.
     */
    @GetMapping("/listings/{listingId}")
    public List<TenantProfileCardDto> getInterestedByListing(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID listingId,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang) {

        UUID agencyUserId = agencyService.resolvePublisherUserId(
                principal.getUserId(), principal.getUserType());

        // Verifica che l'annuncio appartenga all'agenzia
        listingRepo.findByIdAndPublisherUserId(listingId, agencyUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Listing not found or not owned by your agency"));

        // Scope check per operatori
        if (principal.getUserType() == com.inquilino.enums.UserType.AGENCY_OPERATOR) {
            agencyService.assertListingScope(listingId, principal.getUserId());
        }

        List<Match> matches = matchRepo.findInterestedByListing(listingId, INTERESTED_STATES);
        return matches.stream().map(m -> buildCard(m, resolveLang(lang))).toList();
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
}
