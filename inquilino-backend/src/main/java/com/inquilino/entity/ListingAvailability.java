package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "listing_availability")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListingAvailability {

    @Id
    @Column(name = "listing_id")
    private UUID listingId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "listing_id")
    private Listing listing;

    // Stato immobile
    @Column(length = 30)
    private String conditionStatus;   // new|excellent|renovated|good|habitable|to_restore

    @Column(length = 30)
    private String furnishedStatus;   // furnished|partially_furnished|unfurnished

    @Column(length = 30)
    private String kitchenStatus;     // equipped|partially_equipped|not_equipped

    @Column(length = 30)
    private String heatingType;       // centralized|autonomous|heat_pump|none|other

    @Column(length = 30)
    private String coolingType;       // air_conditioning|central_cooling|none|other

    // Disponibilità
    @Column(length = 30)
    private String availabilityStatus; // available_now|available_from_date|rented|reserved

    private LocalDate availableFrom;
    private LocalDate availableTo;
    private Integer minimumContractDurationMonths;
    private Integer maximumContractDurationMonths;
    private Integer minimumStayDays;
    private Integer maximumStayDays;

    // Regole
    private Integer maxOccupants;

    @Builder.Default
    private boolean petsAllowed = false;

    @Builder.Default
    private boolean smokingAllowed = false;

    @Builder.Default
    private boolean childrenAllowed = true;

    @Builder.Default
    private boolean sublettingAllowed = false;

    @Builder.Default
    private boolean residenceAllowed = true;

    @Builder.Default
    private boolean studentsAllowed = true;

    @Builder.Default
    private boolean workersAllowed = true;

    @Builder.Default
    private boolean shortStayAllowed = false;

    @Column(columnDefinition = "TEXT")
    private String notesForTenants;
}
