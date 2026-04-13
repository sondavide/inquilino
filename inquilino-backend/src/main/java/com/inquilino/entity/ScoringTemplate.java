package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Named scoring template that overrides the default equal-weight (20/20/20/20/20)
 * formula in MatchingService.calcTenantStrength().
 *
 * Weights are raw integers ≥ 0. They are normalized to sum=100 at calculation time,
 * so only relative magnitudes matter. A weight of 0 excludes a factor entirely.
 *
 * Live-link semantics: profiles store a FK to the template. When a template is
 * updated, a background job recalculates all linked VERIFIED profiles.
 */
@Entity
@Table(name = "scoring_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScoringTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** Weight for having a supervisor-approved identity document. */
    @Builder.Default
    @Column(name = "weight_identity", nullable = false)
    private int weightIdentity = 20;

    /** Weight for having a supervisor-approved income document (payslip or tax return). */
    @Builder.Default
    @Column(name = "weight_income", nullable = false)
    private int weightIncome = 20;

    /** Weight for income stability derived from employment type. */
    @Builder.Default
    @Column(name = "weight_stability", nullable = false)
    private int weightStability = 20;

    /** Weight for overall document reliability (ratio of approved docs). */
    @Builder.Default
    @Column(name = "weight_documents", nullable = false)
    private int weightDocuments = 20;

    /** Weight for having a guarantor. */
    @Builder.Default
    @Column(name = "weight_guarantor", nullable = false)
    private int weightGuarantor = 20;

    /** When true this template is used for profiles with no explicit template assigned. */
    @Builder.Default
    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    @Column(name = "created_by")
    private UUID createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
