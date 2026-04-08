package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "landlord_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LandlordProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    private String displayName;

    // Agency-specific
    private String agencyName;
    private String vatNumber;
    private String reaNumber;
    private String websiteUrl;

    // Contact
    @Column(nullable = false, length = 30)
    @Builder.Default
    private String contactMode = "platform_only";

    private String contactPhone;
    private String contactEmail;

    @Column(nullable = false)
    @Builder.Default
    private int profileCompletion = 0;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
