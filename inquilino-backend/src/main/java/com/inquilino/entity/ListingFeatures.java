package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "listing_features")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListingFeatures {

    @Id
    @Column(name = "listing_id")
    private UUID listingId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "listing_id")
    private Listing listing;

    @Column(precision = 8, scale = 2)
    private BigDecimal surfaceSqm;

    @Column(precision = 8, scale = 2)
    private BigDecimal commercialSurfaceSqm;

    private Integer roomsCount;
    private Integer bedroomsCount;
    private Integer bathroomsCount;
    private Integer floorNumber;
    private Integer totalBuildingFloors;

    @Builder.Default
    private boolean elevator = false;

    @Builder.Default
    private int parkingSpacesCount = 0;

    @Builder.Default
    private boolean garageIncluded = false;

    @Builder.Default
    private int balconiesCount = 0;

    @Builder.Default
    private int terracesCount = 0;

    @Builder.Default
    private int cellarsCount = 0;

    // Room-specific
    @Column(length = 30)
    private String roomType;   // single | double | shared_bed

    @Column(precision = 8, scale = 2)
    private BigDecimal roomSurfaceSqm;

    private Boolean roomFurnished;
    private Boolean privateBathroom;
    private Boolean sharedBathroom;
    private Boolean sharedKitchen;
    private Integer roommatesCount;

    @Builder.Default
    private boolean studentsOnly = false;
}
