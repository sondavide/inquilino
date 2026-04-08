package com.inquilino.entity;

import com.inquilino.enums.EnergyClass;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "listing_energy")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListingEnergy {

    @Id
    @Column(name = "listing_id")
    private UUID listingId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "listing_id")
    private Listing listing;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private EnergyClass energyClass;

    @Column(precision = 8, scale = 2)
    private BigDecimal energyIndexEpgl;

    @Builder.Default
    private boolean energyCertificateAvailable = false;

    @Column(columnDefinition = "TEXT")
    private String energyCertificateFileUrl;

    @Column(length = 30)
    private String heatingEnergySource; // gas|electric|district_heating|biomass|other

    @Builder.Default
    private boolean renewableEnergyPresent = false;
}
