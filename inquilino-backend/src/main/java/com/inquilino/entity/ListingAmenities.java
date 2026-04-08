package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Dotazioni e comfort dell'immobile, salvate come JSONB.
 * Chiavi standard (tutte boolean, default false):
 *   air_conditioning, internet_available, fiber_available, tv,
 *   washing_machine, dishwasher, dryer, oven, microwave, refrigerator, freezer,
 *   security_door, alarm_system, concierge,
 *   garden, private_garden, shared_garden, pool, gym,
 *   wheelchair_accessible, disabled_bathroom
 */
@Entity
@Table(name = "listing_amenities")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListingAmenities {

    @Id
    @Column(name = "listing_id")
    private UUID listingId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "listing_id")
    private Listing listing;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    @Builder.Default
    private Map<String, Boolean> amenities = new HashMap<>();
}
