package com.inquilino.entity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Type;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "agency_memberships",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_membership_agency_operator",
           columnNames = {"agency_user_id", "operator_user_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AgencyMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** User ID dell'agenzia (owner). */
    @Column(name = "agency_user_id", nullable = false)
    private UUID agencyUserId;

    /** User ID dell'operatore (tipo AGENCY_OPERATOR). */
    @Column(name = "operator_user_id", nullable = false)
    private UUID operatorUserId;

    /**
     * Scope degli annunci accessibili all'operatore.
     * null = accesso a tutti gli annunci dell'agenzia.
     * Lista di UUID = solo quegli annunci specifici.
     */
    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<UUID> listingScope;

    @Column(nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime addedAt = LocalDateTime.now();

    @Column(name = "added_by_user_id")
    private UUID addedByUserId;
}
