package com.inquilino.service;

import com.inquilino.entity.Match;
import com.inquilino.entity.TenantProfile;
import com.inquilino.enums.MatchState;
import com.inquilino.repository.LandlordProfileRepository;
import com.inquilino.repository.ListingRepository;
import com.inquilino.repository.MatchRepository;
import com.inquilino.repository.TenantProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Gestisce le transizioni di stato del Match.
 *
 * Macchina a stati:
 *   ALGORITHMIC
 *     ↓ tenant clicca "sono interessato"   → TENANT_INTERESTED
 *     ↓ landlord clicca "segnala interesse" → LANDLORD_INTERESTED
 *   TENANT_INTERESTED + landlord esprime interesse → MUTUAL_INTEREST
 *   LANDLORD_INTERESTED + tenant accetta invito   → MUTUAL_INTEREST
 *   MUTUAL_INTEREST → CONTACT_UNLOCKED (quando entrambi accettano esplicitamente)
 *   Qualsiasi → ARCHIVED (rifiuto o dismiss)
 */
@Service
@RequiredArgsConstructor
public class MatchStateService {

    private final MatchRepository         matchRepo;
    private final TenantProfileRepository tenantProfileRepo;
    private final ListingRepository       listingRepo;
    private final NotificationService     notificationService;

    // ─── Inquilino: "sono interessato" ───────────────────────────────────────

    @Transactional
    public Match tenantExpressInterest(UUID matchId, UUID tenantUserId) {
        Match match = getMatchForTenant(matchId, tenantUserId);
        assertNotArchived(match);

        MatchState current = match.getMatchState();
        match.setTenantInterestAt(LocalDateTime.now());

        if (current == MatchState.LANDLORD_INTERESTED) {
            // Match reciproco
            match.setMatchState(MatchState.MUTUAL_INTEREST);
            notifyMutualMatch(match);
        } else if (current == MatchState.ALGORITHMIC) {
            match.setMatchState(MatchState.TENANT_INTERESTED);
        }
        // Se già TENANT_INTERESTED o oltre → no-op

        return matchRepo.save(match);
    }

    // ─── Inquilino: "non mi interessa" ───────────────────────────────────────

    @Transactional
    public Match tenantDismiss(UUID matchId, UUID tenantUserId) {
        Match match = getMatchForTenant(matchId, tenantUserId);
        assertNotArchived(match);
        match.setMatchState(MatchState.ARCHIVED);
        return matchRepo.save(match);
    }

    // ─── Inquilino: accetta invito del locatore ───────────────────────────────

    @Transactional
    public Match tenantAcceptInvite(UUID matchId, UUID tenantUserId) {
        Match match = getMatchForTenant(matchId, tenantUserId);
        assertNotArchived(match);

        if (match.getMatchState() == MatchState.LANDLORD_INTERESTED) {
            match.setMatchState(MatchState.MUTUAL_INTEREST);
            match.setTenantInterestAt(LocalDateTime.now());
            notifyMutualMatch(match);
        }
        return matchRepo.save(match);
    }

    // ─── Locatore: "segnala interesse" ───────────────────────────────────────

    @Transactional
    public Match landlordExpressInterest(UUID matchId, UUID landlordUserId) {
        Match match = getMatchForLandlord(matchId, landlordUserId);
        assertNotArchived(match);

        MatchState current = match.getMatchState();
        match.setLandlordInterestAt(LocalDateTime.now());

        if (current == MatchState.TENANT_INTERESTED) {
            match.setMatchState(MatchState.MUTUAL_INTEREST);
            notifyMutualMatch(match);
        } else if (current == MatchState.ALGORITHMIC) {
            match.setMatchState(MatchState.LANDLORD_INTERESTED);
        }

        return matchRepo.save(match);
    }

    // ─── Locatore: "invita al contatto" (sblocca direttamente il contatto) ───

    @Transactional
    public Match landlordInvite(UUID matchId, UUID landlordUserId) {
        Match match = getMatchForLandlord(matchId, landlordUserId);
        assertNotArchived(match);

        match.setLandlordInterestAt(LocalDateTime.now());

        MatchState current = match.getMatchState();
        if (current == MatchState.TENANT_INTERESTED) {
            // Tenant ha già espresso interesse → sblocca subito
            match.setMatchState(MatchState.CONTACT_UNLOCKED);
            match.setContactUnlockedAt(LocalDateTime.now());
            notifyContactUnlocked(match);
        } else if (current == MatchState.ALGORITHMIC || current == MatchState.LANDLORD_INTERESTED) {
            match.setMatchState(MatchState.LANDLORD_INTERESTED);
        }

        return matchRepo.save(match);
    }

    // ─── Locatore: "non interessante" ────────────────────────────────────────

    @Transactional
    public Match landlordDismiss(UUID matchId, UUID landlordUserId) {
        Match match = getMatchForLandlord(matchId, landlordUserId);
        assertNotArchived(match);
        match.setMatchState(MatchState.ARCHIVED);
        return matchRepo.save(match);
    }

    // ─── Sblocco contatto (da MUTUAL_INTEREST) ────────────────────────────────

    @Transactional
    public Match unlockContact(UUID matchId, UUID requestingUserId) {
        Match match = matchRepo.findById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));

        // Verifica che l'utente sia parte del match
        verifyParticipant(match, requestingUserId);
        assertNotArchived(match);

        if (match.getMatchState() == MatchState.MUTUAL_INTEREST) {
            match.setMatchState(MatchState.CONTACT_UNLOCKED);
            match.setContactUnlockedAt(LocalDateTime.now());
            notifyContactUnlocked(match);
        }

        return matchRepo.save(match);
    }

    // ─── Notifiche ────────────────────────────────────────────────────────────

    private void notifyMutualMatch(Match match) {
        // Notifica l'inquilino
        TenantProfile tenant = tenantProfileRepo.findById(match.getTenantProfileId()).orElse(null);
        if (tenant != null) {
            notificationService.notifyMutualMatch(tenant.getUser().getId(), match.getId(), true);
        }
        // Notifica il locatore
        listingRepo.findById(match.getListingId()).ifPresent(listing ->
                notificationService.notifyMutualMatch(listing.getPublisherUserId(), match.getId(), false));
    }

    private void notifyContactUnlocked(Match match) {
        TenantProfile tenant = tenantProfileRepo.findById(match.getTenantProfileId()).orElse(null);
        if (tenant != null) {
            notificationService.notifyContactUnlocked(tenant.getUser().getId());
        }
        listingRepo.findById(match.getListingId()).ifPresent(listing ->
                notificationService.notifyContactUnlocked(listing.getPublisherUserId()));
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private Match getMatchForTenant(UUID matchId, UUID tenantUserId) {
        Match match = matchRepo.findById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));
        TenantProfile profile = tenantProfileRepo.findByUserId(tenantUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        if (!match.getTenantProfileId().equals(profile.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your match");
        }
        return match;
    }

    private Match getMatchForLandlord(UUID matchId, UUID landlordUserId) {
        Match match = matchRepo.findById(matchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Match not found"));
        listingRepo.findById(match.getListingId())
                .filter(l -> l.getPublisherUserId().equals(landlordUserId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your listing"));
        return match;
    }

    private void verifyParticipant(Match match, UUID userId) {
        TenantProfile tenantProfile = tenantProfileRepo.findByUserId(userId).orElse(null);
        if (tenantProfile != null && tenantProfile.getId().equals(match.getTenantProfileId())) return;
        listingRepo.findById(match.getListingId())
                .filter(l -> l.getPublisherUserId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a participant"));
    }

    private void assertNotArchived(Match match) {
        if (match.getMatchState() == MatchState.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Match is archived");
        }
    }
}
