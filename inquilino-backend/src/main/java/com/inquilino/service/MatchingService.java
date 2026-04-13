package com.inquilino.service;

import com.inquilino.entity.*;
import com.inquilino.enums.*;
import com.inquilino.enums.MatchState;
import com.inquilino.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Calcola e persiste i record Match tra annunci e profili tenant.
 *
 * Viene invocato:
 * - da ListingValidationService quando un Listing transita a PUBLISHED
 * - da SupervisorService quando un TenantProfile transita a VERIFIED
 *
 * Formula aggregate (da matching_ux_privacy_prd.md §9.2):
 *   match_score_tenant   = geo*0.35 + price*0.30 + timing*0.15 + fit*0.20
 *   match_score_landlord = geo*0.20 + price*0.20 + timing*0.10 + fit*0.20 + strength*0.30
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MatchingService {

    private static final double GEO_RADIUS_METERS = 5_000.0;

    private final MatchRepository            matchRepo;
    private final TenantProfileRepository    tenantProfileRepo;
    private final ListingRepository          listingRepo;
    private final ListingLocationRepository  locationRepo;
    private final InterestAreaRepository     interestAreaRepo;
    private final DocumentRepository         documentRepo;
    private final FieldValidationRepository  fieldValidationRepo;
    private final ScoringTemplateRepository  scoringTemplateRepo;
    private final ScoringService             scoringService;
    private final MatchSummaryService        summaryService;

    // ─── Entry points ─────────────────────────────────────────────────────────

    /**
     * Chiamato quando un Listing diventa PUBLISHED.
     * Trova tutti i profili tenant VERIFIED+active e calcola i match.
     */
    @Transactional
    public void computeMatchesForListing(UUID listingId) {
        Listing listing = listingRepo.findById(listingId).orElse(null);
        if (listing == null || listing.getLocation() == null
                || listing.getLocation().getDisplayPoint() == null) {
            log.warn("computeMatchesForListing: listing {} non ha displayPoint, skip", listingId);
            return;
        }

        double lat = listing.getLocation().getDisplayPoint().getY();
        double lng = listing.getLocation().getDisplayPoint().getX();

        List<UUID> candidateUserIds = interestAreaRepo.findUserIdsNearPoint(lat, lng, GEO_RADIUS_METERS);
        if (candidateUserIds.isEmpty()) return;

        List<TenantProfile> candidates = tenantProfileRepo
                .findByUserIdInAndVerificationStatusAndActiveTrue(candidateUserIds, VerificationStatus.VERIFIED);

        log.info("computeMatchesForListing: listing={} → {} candidati", listingId, candidates.size());
        for (TenantProfile tenant : candidates) {
            upsertMatch(listing, tenant);
        }
    }

    /**
     * Chiamato quando un TenantProfile diventa VERIFIED.
     * Trova tutti gli annunci PUBLISHED compatibili e calcola i match.
     */
    @Transactional
    public void computeMatchesForTenant(UUID tenantProfileId) {
        TenantProfile tenant = tenantProfileRepo.findById(tenantProfileId).orElse(null);
        if (tenant == null) return;

        UUID userId = tenant.getUser().getId();
        List<UUID> listingIds = locationRepo.findPublishedListingIdsNearUserAreas(userId);
        if (listingIds.isEmpty()) return;

        // Fetch listings con tutte le relazioni
        List<Listing> listings = listingRepo.findAllById(listingIds);
        log.info("computeMatchesForTenant: profile={} → {} annunci candidati", tenantProfileId, listings.size());
        for (Listing listing : listings) {
            upsertMatch(listing, tenant);
        }
    }

    /**
     * Chiamato quando un Listing esce dallo stato PUBLISHED (torna a DRAFT, viene
     * rifiutato, archiviato o sospeso). Archivia tutti i match algoritmici aperti.
     * I match in stato avanzato (MUTUAL_INTEREST, CONTACT_UNLOCKED, ecc.) non vengono
     * toccati: le parti hanno già interagito e la conversazione rimane visibile.
     */
    @Transactional
    public void archiveMatchesForListing(UUID listingId) {
        List<Match> toArchive = matchRepo.findByListingId(listingId).stream()
                .filter(m -> m.getMatchState() == MatchState.ALGORITHMIC
                          || m.getMatchState() == MatchState.TENANT_INTERESTED
                          || m.getMatchState() == MatchState.LANDLORD_INTERESTED)
                .toList();
        toArchive.forEach(m -> {
            m.setMatchState(MatchState.ARCHIVED);
            matchRepo.save(m);
        });
        log.info("archiveMatchesForListing: listing={} → {} match archiviati", listingId, toArchive.size());
    }

    /**
     * Chiamato quando un profilo tenant viene disabilitato (active=false).
     * Archivia i match non ancora reciproci.
     */
    @Transactional
    public void archiveMatchesForTenant(UUID tenantProfileId) {
        List<Match> toArchive = matchRepo.findByTenantProfileId(tenantProfileId).stream()
                .filter(m -> m.getMatchState() == MatchState.ALGORITHMIC
                          || m.getMatchState() == MatchState.TENANT_INTERESTED
                          || m.getMatchState() == MatchState.LANDLORD_INTERESTED)
                .toList();
        toArchive.forEach(m -> {
            m.setMatchState(MatchState.ARCHIVED);
            matchRepo.save(m);
        });
        log.info("archiveMatchesForTenant: profile={} → {} match archiviati", tenantProfileId, toArchive.size());
    }

    // ─── Core logic ───────────────────────────────────────────────────────────

    private void upsertMatch(Listing listing, TenantProfile tenant) {
        Optional<Match> existing = matchRepo
                .findByListingIdAndTenantProfileId(listing.getId(), tenant.getId());

        // Non ricalcolare se l'utente ha già interagito (stato avanzato)
        // ARCHIVED viene resettato: il listing potrebbe essere cambiato dopo la ripubblicazione
        if (existing.isPresent()) {
            MatchState state = existing.get().getMatchState();
            if (state != MatchState.ALGORITHMIC && state != MatchState.ARCHIVED) return;
        }

        MatchCalcResult calc = calculate(listing, tenant);

        // Non salvare match troppo deboli (score < 40)
        if (calc.matchScoreTenant() < 40.0 && calc.matchScoreLandlord() < 40.0) {
            existing.ifPresent(matchRepo::delete);
            return;
        }

        Match match = existing.orElse(Match.builder()
                .listingId(listing.getId())
                .tenantProfileId(tenant.getId())
                .build());

        // Se era ARCHIVED (es. listing tornato in bozza poi ripubblicato), resetta lo stato
        if (existing.isPresent() && existing.get().getMatchState() == MatchState.ARCHIVED) {
            match.setMatchState(MatchState.ALGORITHMIC);
        }

        applyCalc(match, calc);

        // Genera summary AI in IT + EN (solo se non esiste già o se il match è stato ricalcolato)
        boolean needsSummary = existing.isEmpty() || existing.get().getMatchState() == MatchState.ARCHIVED;
        if (match.getMatchSummary() == null || needsSummary) {
            String occupationLabel = tenant.getEmploymentType() != null
                    ? tenant.getEmploymentType().name().toLowerCase().replace("_", " ") : null;
            String municipality = listing.getLocation() != null
                    ? listing.getLocation().getMunicipality() : null;
            String band = calc.matchBand() != null ? calc.matchBand().name() : null;
            match.setMatchSummary(summaryService.generate(
                    band, calc.geoScore(), calc.priceScore(), calc.timingScore(),
                    calc.fitScore(), calc.tenantStrengthScore(),
                    calc.priceBand(), occupationLabel, municipality, "it"));
            match.setMatchSummaryEn(summaryService.generate(
                    band, calc.geoScore(), calc.priceScore(), calc.timingScore(),
                    calc.fitScore(), calc.tenantStrengthScore(),
                    calc.priceBand(), occupationLabel, municipality, "en"));
        }
        if (match.getTenantMatchSummary() == null || needsSummary) {
            String municipality = listing.getLocation() != null
                    ? listing.getLocation().getMunicipality() : null;
            ListingAvailability avail = listing.getAvailability();
            boolean  petsAllowed    = avail != null && avail.isPetsAllowed();
            Integer  maxOccupants   = avail != null ? avail.getMaxOccupants() : null;
            String   furnishedStatus = avail != null ? avail.getFurnishedStatus() : null;
            String   band           = calc.matchBand() != null ? calc.matchBand().name() : null;
            match.setTenantMatchSummary(summaryService.generateForTenant(
                    band, calc.geoScore(), calc.priceScore(), calc.timingScore(), calc.fitScore(),
                    calc.priceBand(), municipality, petsAllowed, maxOccupants, furnishedStatus, "it"));
            match.setTenantMatchSummaryEn(summaryService.generateForTenant(
                    band, calc.geoScore(), calc.priceScore(), calc.timingScore(), calc.fitScore(),
                    calc.priceBand(), municipality, petsAllowed, maxOccupants, furnishedStatus, "en"));
        }

        matchRepo.save(match);
    }

    // ─── Calcolo ──────────────────────────────────────────────────────────────

    private MatchCalcResult calculate(Listing listing, TenantProfile tenant) {
        UUID userId = tenant.getUser().getId();

        // ── Geo ──────────────────────────────────────────────────────────────
        double displayLat = 0, displayLng = 0;
        boolean hasPoint  = listing.getLocation() != null
                         && listing.getLocation().getDisplayPoint() != null;
        if (hasPoint) {
            displayLat = listing.getLocation().getDisplayPoint().getY();
            displayLng = listing.getLocation().getDisplayPoint().getX();
        }

        // Verifica se il punto è dentro almeno un'area o entro 5 km
        boolean geoMatch;
        double  geoDistMeters = Double.MAX_VALUE;
        double  geoScore;

        if (!hasPoint) {
            geoMatch     = false;
            geoScore     = 0;
        } else {
            List<UUID> geoUsers = interestAreaRepo.findUserIdsNearPoint(
                    displayLat, displayLng, GEO_RADIUS_METERS);
            geoMatch = geoUsers.contains(userId);

            Double minDist = interestAreaRepo.findMinDistanceToUserAreas(userId, displayLat, displayLng);
            if (minDist == null) {
                // Solo ANYWHERE → distanza 0
                geoDistMeters = 0;
            } else {
                geoDistMeters = minDist;
            }
            geoScore = geoMatch ? calcGeoScore(geoDistMeters) : 0.0;
        }

        // ── Price ─────────────────────────────────────────────────────────────
        BigDecimal rentBD   = listing.getPrice() != null ? listing.getPrice().getMonthlyRent()   : null;
        BigDecimal budgetBD = tenant.getMaxBudget();
        boolean priceMatch;
        double  priceDelta = 0;
        String  priceBand;
        double  priceScore;

        if (rentBD == null || budgetBD == null || budgetBD.doubleValue() <= 0) {
            priceMatch = true; // mancano dati → non escludere
            priceBand  = "unknown";
            priceScore = 50;
        } else {
            double rent   = rentBD.doubleValue();
            double budget = budgetBD.doubleValue();
            priceDelta = (rent - budget) / budget * 100.0;
            priceMatch = rent <= budget * 1.10;
            if (rent <= budget) {
                priceBand  = "within_budget";
                priceScore = 100.0;
            } else if (rent <= budget * 1.10) {
                priceBand  = "within_tolerance";
                double excess = (rent - budget) / (budget * 0.10);
                priceScore = 100.0 * (1.0 - excess);
            } else {
                priceBand  = "over_budget";
                priceScore = 0.0;
            }
        }

        // ── Timing ────────────────────────────────────────────────────────────
        LocalDate availFrom   = listing.getAvailability() != null
                              ? listing.getAvailability().getAvailableFrom() : null;
        LocalDate desiredDate = tenant.getMoveInDate();
        boolean timingMatch;
        double  timingScore;

        if (availFrom == null || desiredDate == null) {
            timingMatch = true;
            timingScore = 70; // dato mancante → punteggio neutro
        } else {
            long diff = Math.abs(ChronoUnit.DAYS.between(availFrom, desiredDate));
            timingMatch = diff <= 45;
            timingScore = diff <= 7 ? 100.0 : (diff <= 45 ? 100.0 * (1.0 - (double) diff / 45.0) : 0.0);
        }

        // ── Property type ─────────────────────────────────────────────────────
        // TenantProfile non ha ancora desiredPropertyTypes → sempre compatibile
        boolean propertyTypeMatch = true;

        // ── Fit score ─────────────────────────────────────────────────────────
        double fitScore = calcFitScore(listing, tenant);

        // ── Tenant strength ───────────────────────────────────────────────────
        List<Document> docs = documentRepo.findByUserId(tenant.getUser().getId());
        double tenantStrengthScore = calcTenantStrength(tenant, docs);

        // ── Aggregati ─────────────────────────────────────────────────────────
        boolean anyHardFail = !geoMatch || !priceMatch || !timingMatch;

        double scoreTenant   = geoScore * 0.35 + priceScore * 0.30
                             + timingScore * 0.15 + fitScore * 0.20;
        double scoreLandlord = geoScore * 0.20 + priceScore * 0.20
                             + timingScore * 0.10 + fitScore * 0.20
                             + tenantStrengthScore * 0.30;

        // Se hard filter fallisce, abbatti di molto il punteggio
        if (anyHardFail) {
            scoreTenant   *= 0.30;
            scoreLandlord *= 0.30;
        }

        MatchBand band = toBand(scoreTenant);

        return new MatchCalcResult(
                geoMatch, priceMatch, timingMatch, propertyTypeMatch,
                geoDistMeters == Double.MAX_VALUE ? null : geoDistMeters,
                priceDelta, priceBand,
                geoScore, priceScore, timingScore, fitScore, tenantStrengthScore,
                scoreTenant, scoreLandlord, band);
    }

    private double calcGeoScore(double distanceMeters) {
        if (distanceMeters <= 0) return 100.0;
        return Math.max(0, 100.0 * (1.0 - distanceMeters / GEO_RADIUS_METERS));
    }

    private double calcFitScore(Listing listing, TenantProfile tenant) {
        int   checks = 5;
        int   passed = 0;

        // 1. Animali
        boolean availPets = listing.getAvailability() == null || listing.getAvailability().isPetsAllowed();
        if (!tenant.isHasPets() || availPets) passed++;

        // 2. Fumo
        boolean availSmoke = listing.getAvailability() == null || listing.getAvailability().isSmokingAllowed();
        if (!tenant.isSmoker() || availSmoke) passed++;

        // 3. Numero occupanti
        Integer maxOcc = listing.getAvailability() != null ? listing.getAvailability().getMaxOccupants() : null;
        Integer tenOcc = tenant.getOccupants();
        if (maxOcc == null || tenOcc == null || tenOcc <= maxOcc) passed++;

        // 4. Tipo immobile (nessun filtro per ora → sempre compatibile)
        passed++;

        // 5. Arredamento: senza preferenze → sempre compatibile
        passed++;

        return (double) passed / checks * 100.0;
    }

    private double calcTenantStrength(TenantProfile tenant, List<Document> docs) {
        // Carica il template assegnato al profilo (null → pesi default 20/20/20/20/20)
        com.inquilino.entity.ScoringTemplate tpl = tenant.getScoringTemplateId() != null
                ? scoringTemplateRepo.findById(tenant.getScoringTemplateId()).orElse(null)
                : null;

        int wId  = tpl != null ? tpl.getWeightIdentity()  : 20;
        int wInc = tpl != null ? tpl.getWeightIncome()    : 20;
        int wStb = tpl != null ? tpl.getWeightStability() : 20;
        int wDoc = tpl != null ? tpl.getWeightDocuments() : 20;
        int wGua = tpl != null ? tpl.getWeightGuarantor() : 20;
        int total = wId + wInc + wStb + wDoc + wGua;
        if (total == 0) return 0.0;

        // Normalizza a 100 così la somma massima è sempre 100
        double nId  = 100.0 * wId  / total;
        double nInc = 100.0 * wInc / total;
        double nStb = 100.0 * wStb / total;
        double nDoc = 100.0 * wDoc / total;
        double nGua = 100.0 * wGua / total;

        // Solo documenti approvati dal supervisore contano per il punteggio
        java.util.Set<String> approvedDocFields =
                scoringService.getSupervisorApprovedDocFields(tenant.getId());

        double score = 0;

        // Identità approvata dal supervisore
        boolean identityApproved = approvedDocFields.contains("doc.IDENTITY")
                && docs.stream().anyMatch(d -> d.getType() == DocumentType.IDENTITY);
        if (identityApproved) score += nId;

        // Reddito approvato dal supervisore (busta paga o 730)
        boolean incomeApproved = (approvedDocFields.contains("doc.PAYSLIP")
                                  || approvedDocFields.contains("doc.TAX_RETURN"))
                && docs.stream().anyMatch(d -> d.getType() == DocumentType.PAYSLIP
                                           || d.getType() == DocumentType.TAX_RETURN);
        if (incomeApproved) score += nInc;

        // Stabilità lavorativa (HIGH = peso pieno, MEDIUM = metà peso)
        String stability = scoringService.incomeStabilityCategory(tenant);
        if ("HIGH".equals(stability))        score += nStb;
        else if ("MEDIUM".equals(stability)) score += nStb / 2.0;

        // Affidabilità documentale (solo approvazioni supervisore)
        String docRel = scoringService.documentReliabilityCategory(docs, tenant.getId());
        if ("HIGH".equals(docRel))        score += nDoc;
        else if ("MEDIUM".equals(docRel)) score += nDoc / 2.0;

        // Garante
        if (tenant.isHasGuarantor()) score += nGua;

        return Math.min(score, 100.0);
    }

    private MatchBand toBand(double score) {
        if (score >= 85) return MatchBand.EXCELLENT_MATCH;
        if (score >= 70) return MatchBand.GOOD_MATCH;
        if (score >= 55) return MatchBand.MEDIUM_MATCH;
        if (score >= 40) return MatchBand.WEAK_MATCH;
        return null; // sotto 40 non mostrare
    }

    private void applyCalc(Match m, MatchCalcResult c) {
        m.setGeoMatch(c.geoMatch());
        m.setPriceMatch(c.priceMatch());
        m.setTimingMatch(c.timingMatch());
        m.setPropertyTypeMatch(c.propertyTypeMatch());
        m.setGeoDistanceMeters(c.geoDistanceMeters());
        m.setPriceDeltaPercentage(c.priceDeltaPercentage());
        m.setPriceBand(c.priceBand());
        m.setGeoScore(c.geoScore());
        m.setPriceScore(c.priceScore());
        m.setTimingScore(c.timingScore());
        m.setFitScore(c.fitScore());
        m.setTenantStrengthScore(c.tenantStrengthScore());
        m.setMatchScoreTenant(c.matchScoreTenant());
        m.setMatchScoreLandlord(c.matchScoreLandlord());
        m.setMatchBand(c.matchBand());
    }

    // ─── Record interno ───────────────────────────────────────────────────────

    private record MatchCalcResult(
            boolean geoMatch, boolean priceMatch, boolean timingMatch, boolean propertyTypeMatch,
            Double geoDistanceMeters, double priceDeltaPercentage, String priceBand,
            double geoScore, double priceScore, double timingScore, double fitScore,
            double tenantStrengthScore,
            double matchScoreTenant, double matchScoreLandlord,
            MatchBand matchBand) {}
}
