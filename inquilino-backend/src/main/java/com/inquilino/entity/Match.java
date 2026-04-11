package com.inquilino.entity;

import com.inquilino.enums.MatchBand;
import com.inquilino.enums.MatchState;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "matches",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_match_listing_tenant",
           columnNames = {"listing_id", "tenant_profile_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "listing_id", nullable = false)
    private UUID listingId;

    @Column(name = "tenant_profile_id", nullable = false)
    private UUID tenantProfileId;

    // ─── Hard filter results ──────────────────────────────────────────────────

    @Builder.Default private boolean geoMatch          = false;
    @Builder.Default private boolean priceMatch        = false;
    @Builder.Default private boolean timingMatch       = false;
    @Builder.Default private boolean propertyTypeMatch = false;

    // ─── Valori calcolati ─────────────────────────────────────────────────────

    private Double geoDistanceMeters;
    private Double priceDeltaPercentage;

    /** within_budget | within_tolerance | over_budget */
    @Column(length = 30)
    private String priceBand;

    // ─── Punteggi soft (0-100 ciascuno) ──────────────────────────────────────

    private Double geoScore;
    private Double priceScore;
    private Double timingScore;
    private Double fitScore;
    private Double tenantStrengthScore;

    // ─── Punteggi aggregati ───────────────────────────────────────────────────

    /** Peso: geo 35%, price 30%, timing 15%, fit 20% */
    private Double matchScoreTenant;

    /** Peso: geo 20%, price 20%, timing 10%, fit 20%, strength 30% */
    private Double matchScoreLandlord;

    // ─── Banda di compatibilità ───────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private MatchBand matchBand;

    // ─── Macchina a stati ─────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private MatchState matchState = MatchState.ALGORITHMIC;

    // ─── Timestamps ───────────────────────────────────────────────────────────

    private LocalDateTime tenantInterestAt;
    private LocalDateTime landlordInterestAt;
    private LocalDateTime contactUnlockedAt;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // ─── AI summary ───────────────────────────────────────────────────────────

    /** Descrizione AI della compatibilità dal punto di vista del locatore — IT. */
    @Column(columnDefinition = "TEXT")
    private String matchSummary;

    /** Descrizione AI della compatibilità dal punto di vista del locatore — EN. */
    @Column(columnDefinition = "TEXT")
    private String matchSummaryEn;

    /** Descrizione AI della compatibilità dal punto di vista dell'inquilino — IT. */
    @Column(columnDefinition = "TEXT")
    private String tenantMatchSummary;

    /** Descrizione AI della compatibilità dal punto di vista dell'inquilino — EN. */
    @Column(columnDefinition = "TEXT")
    private String tenantMatchSummaryEn;
}
