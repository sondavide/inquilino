package com.inquilino.entity;

import com.inquilino.enums.AgencyStatus;
import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "agency_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AgencyProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Utente owner dell'agenzia (tipo AGENCY). */
    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(nullable = false)
    private String agencyName;

    private String vatNumber;
    private String reaNumber;
    private String websiteUrl;

    private String contactEmail;
    private String contactPhone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AgencyStatus status = AgencyStatus.PENDING_APPROVAL;

    /**
     * Aree di pertinenza dell'agenzia.
     * Struttura di ogni elemento:
     * { type: "COMUNE"|"PROVINCIA"|"REGIONE", name, osmId, displayName, boundingBox? }
     */
    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private List<Map<String, Object>> areas = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime approvedAt;

    @Column(name = "approved_by_admin_id")
    private UUID approvedByAdminId;

    /** Motivo eventuale sospensione/rifiuto. */
    @Column(columnDefinition = "TEXT")
    private String statusNote;
}
