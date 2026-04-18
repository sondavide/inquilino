package com.inquilino.repository;

import com.inquilino.entity.Match;
import com.inquilino.enums.MatchBand;
import com.inquilino.enums.MatchState;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MatchRepository extends JpaRepository<Match, UUID> {

    Optional<Match> findByListingIdAndTenantProfileId(UUID listingId, UUID tenantProfileId);

    // ─── Lato inquilino ───────────────────────────────────────────────────────

    /** Lista annunci compatibili per l'inquilino (esclude ARCHIVED, solo banded). */
    @Query("SELECT m FROM Match m WHERE m.tenantProfileId = :profileId " +
           "AND m.matchState <> :archived AND m.matchBand IS NOT NULL " +
           "ORDER BY m.matchScoreTenant DESC NULLS LAST")
    List<Match> findActiveTenantMatches(@Param("profileId") UUID tenantProfileId,
                                        @Param("archived") MatchState archived);

    // ─── Lato locatore ────────────────────────────────────────────────────────

    /** Lista profili compatibili per un annuncio (esclude ARCHIVED, solo banded). */
    @Query("SELECT m FROM Match m WHERE m.listingId = :listingId " +
           "AND m.matchState <> :archived AND m.matchBand IS NOT NULL " +
           "ORDER BY m.matchScoreLandlord DESC NULLS LAST")
    Page<Match> findActiveListingMatches(@Param("listingId") UUID listingId,
                                         @Param("archived") MatchState archived,
                                         Pageable pageable);

    // ─── Mutual matches ───────────────────────────────────────────────────────

    /** Match reciproci del tenant (MUTUAL_INTEREST o CONTACT_UNLOCKED). */
    @Query("SELECT m FROM Match m WHERE m.tenantProfileId = :profileId " +
           "AND m.matchState IN :states ORDER BY m.updatedAt DESC")
    List<Match> findMutualTenantMatches(@Param("profileId") UUID tenantProfileId,
                                        @Param("states") List<MatchState> states);

    /** Match reciproci per un annuncio (MUTUAL_INTEREST o CONTACT_UNLOCKED). */
    @Query("SELECT m FROM Match m WHERE m.listingId = :listingId " +
           "AND m.matchState IN :states ORDER BY m.updatedAt DESC")
    List<Match> findMutualListingMatches(@Param("listingId") UUID listingId,
                                         @Param("states") List<MatchState> states);

    // ─── Rubrica agenzia ─────────────────────────────────────────────────────

    /** Profili che hanno messo like ad almeno un annuncio PUBLISHED dell'agenzia. */
    @Query("SELECT DISTINCT m FROM Match m " +
           "JOIN Listing l ON m.listingId = l.id " +
           "WHERE l.publisherUserId = :agencyUserId " +
           "AND m.matchState IN :states " +
           "AND l.status = com.inquilino.enums.ListingStatus.PUBLISHED " +
           "ORDER BY m.tenantInterestAt DESC NULLS LAST")
    List<Match> findAgencyRubrica(@Param("agencyUserId") UUID agencyUserId,
                                   @Param("states") List<MatchState> states);

    /** Profili interessati a un annuncio specifico dell'agenzia. */
    @Query("SELECT m FROM Match m WHERE m.listingId = :listingId " +
           "AND m.matchState IN :states ORDER BY m.tenantInterestAt DESC NULLS LAST")
    List<Match> findInterestedByListing(@Param("listingId") UUID listingId,
                                        @Param("states") List<MatchState> states);

    // ─── Utility ──────────────────────────────────────────────────────────────

    List<Match> findByTenantProfileId(UUID tenantProfileId);
    List<Match> findByListingId(UUID listingId);

    /** Conta i match reciproci/sbloccati per un annuncio (per statistiche). */
    long countByListingIdAndMatchStateIn(UUID listingId, List<MatchState> states);
}
