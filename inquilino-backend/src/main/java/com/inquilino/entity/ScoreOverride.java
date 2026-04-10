package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "score_overrides")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScoreOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_profile_id", nullable = false, unique = true)
    private UUID tenantProfileId;

    @Column(name = "supervisor_id", nullable = false)
    private UUID supervisorId;

    /** null = keep algorithm value */
    @Column(length = 10)
    private String rentSustainability;

    /** null = keep algorithm value */
    @Column(length = 10)
    private String incomeStability;

    /** null = keep algorithm value */
    @Column(length = 10)
    private String documentReliability;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
