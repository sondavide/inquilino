package com.inquilino.entity;

import com.inquilino.enums.FieldValidationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Traccia lo stato di validazione di un singolo campo di un annuncio.
 * Stessa logica di FieldValidation per i profili tenant.
 */
@Entity
@Table(name = "listing_field_validations",
       uniqueConstraints = @UniqueConstraint(columnNames = {"listing_id", "field_name"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ListingFieldValidation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "listing_id", nullable = false)
    private UUID listingId;

    @Column(name = "field_name", nullable = false, length = 100)
    private String fieldName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private FieldValidationStatus status = FieldValidationStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "supervisor_id")
    private UUID supervisorId;

    @UpdateTimestamp
    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "corrected_at")
    private LocalDateTime correctedAt;
}
