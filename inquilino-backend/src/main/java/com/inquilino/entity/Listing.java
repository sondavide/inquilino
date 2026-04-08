package com.inquilino.entity;

import com.inquilino.enums.ListingStatus;
import com.inquilino.enums.ListingType;
import com.inquilino.enums.PropertyType;
import com.inquilino.enums.PublisherType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "listings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Listing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "publisher_user_id", nullable = false)
    private UUID publisherUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "publisher_user_id", insertable = false, updatable = false)
    private User publisherUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ListingType listingType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PropertyType propertyType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PublisherType publisherType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private ListingStatus status = ListingStatus.DRAFT;

    @Column(length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "title_en", length = 255)
    private String titleEn;

    @Column(name = "description_en", columnDefinition = "TEXT")
    private String descriptionEn;

    @Column(name = "source_lang", length = 10)
    @Builder.Default
    private String sourceLang = "it";

    @Column(length = 100)
    private String internalReference;

    @Column(unique = true, length = 255)
    private String slug;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime publishedAt;

    @Column(name = "assigned_supervisor_id")
    private UUID assignedSupervisorId;

    @Column(name = "last_validated_by_supervisor_id")
    private UUID lastValidatedBySupervisorId;

    // ─── Relations ────────────────────────────────────────────────────────────

    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, fetch = FetchType.LAZY, optional = true)
    private ListingLocation location;

    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, fetch = FetchType.LAZY, optional = true)
    private ListingPrice price;

    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, fetch = FetchType.LAZY, optional = true)
    private ListingFeatures features;

    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, fetch = FetchType.LAZY, optional = true)
    private ListingAmenities amenities;

    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, fetch = FetchType.LAZY, optional = true)
    private ListingAvailability availability;

    @OneToOne(mappedBy = "listing", cascade = CascadeType.ALL, fetch = FetchType.LAZY, optional = true)
    private ListingEnergy energy;
}
