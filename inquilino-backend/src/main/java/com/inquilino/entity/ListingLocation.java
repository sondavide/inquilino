package com.inquilino.entity;

import com.inquilino.enums.LocationPrecision;
import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Point;

import java.util.UUID;

@Entity
@Table(name = "listing_locations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListingLocation {

    @Id
    @Column(name = "listing_id")
    private UUID listingId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "listing_id")
    private Listing listing;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String countryCode = "IT";

    private String region;
    private String province;
    private String municipality;
    private String district;
    private String postalCode;
    private String streetName;
    private String streetNumber;

    @Column(columnDefinition = "TEXT")
    private String fullAddress;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private LocationPrecision locationPrecision = LocationPrecision.EXACT;

    /** Coordinate reali dell'immobile (non esposte se HIDDEN). */
    @Column(columnDefinition = "geometry(Point,4326)")
    private Point locationPoint;

    /** Coordinate da mostrare (approssimate se APPROXIMATE). */
    @Column(columnDefinition = "geometry(Point,4326)")
    private Point displayPoint;

    private String geocodingProvider;
    private String placeId;
}
