package com.inquilino.entity;

import com.inquilino.enums.FieldValidationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Traccia lo stato di validazione di un singolo campo del profilo tenant.
 * fieldName può essere:
 *  - un campo di TenantProfile (es. "fullName", "monthlyIncome")
 *  - un campo di User (es. "email", "phone")
 *  - un tipo documento prefissato con "doc." (es. "doc.PAYSLIP")
 *
 * Una sola riga per coppia (tenantProfileId, fieldName); upsert su ogni
 * approvazione o segnalazione del supervisore.
 */
@Entity
@Table(name = "field_validations",
       uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_profile_id", "field_name"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FieldValidation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_profile_id", nullable = false)
    private UUID tenantProfileId;

    @Column(name = "field_name", nullable = false, length = 100)
    private String fieldName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private FieldValidationStatus status = FieldValidationStatus.PENDING;

    /** Nota libera del supervisore, non null quando status = FLAGGED */
    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "supervisor_id")
    private UUID supervisorId;

    @UpdateTimestamp
    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    /** Impostato quando l'utente corregge un campo FLAGGED */
    @Column(name = "corrected_at")
    private LocalDateTime correctedAt;
}
