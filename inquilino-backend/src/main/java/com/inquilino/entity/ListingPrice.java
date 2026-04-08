package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "listing_prices")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListingPrice {

    @Id
    @Column(name = "listing_id")
    private UUID listingId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "listing_id")
    private Listing listing;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "EUR";

    @Column(precision = 12, scale = 2)
    private BigDecimal monthlyRent;

    @Column(precision = 12, scale = 2)
    private BigDecimal weeklyRent;

    @Column(precision = 12, scale = 2)
    private BigDecimal dailyRent;

    @Column(precision = 12, scale = 2)
    private BigDecimal condominiumFees;

    @Column(nullable = false)
    @Builder.Default
    private boolean utilitiesIncluded = false;

    @Column(precision = 12, scale = 2)
    private BigDecimal utilitiesEstimatedMonthly;

    private Integer depositMonths;

    @Column(precision = 12, scale = 2)
    private BigDecimal depositAmount;

    @Column(precision = 12, scale = 2)
    private BigDecimal agencyFeeAmount;

    @Column(columnDefinition = "TEXT")
    private String agencyFeeNotes;

    @Column(columnDefinition = "TEXT")
    private String otherCostsNotes;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String priceVisibility = "public";
}
