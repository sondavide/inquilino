package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Nota del supervisore al tenant con richiesta di documenti/dati.
 *
 * Ogni nota può includere:
 * - Un testo libero personalizzato
 * - Una checklist di voci richieste (es. ["PAYSLIP", "GUARANTOR_DATA"])
 *
 * Il tenant vede la nota nella propria dashboard e può rispondere
 * caricando i documenti o completando i dati mancanti.
 */
@Entity
@Table(name = "supervisor_notes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupervisorNote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_profile_id", nullable = false)
    private UUID tenantProfileId;

    @Column(name = "supervisor_id", nullable = false)
    private UUID supervisorId;

    /** Testo libero del supervisore */
    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    /**
     * Lista di voci richieste al tenant.
     * Valori possibili: PAYSLIP, TAX_RETURN, EMPLOYMENT_CONTRACT,
     * BANK_STATEMENT, IDENTITY, LANDLORD_REFERENCE,
     * GUARANTOR_DATA (generico), GUARANTOR_PAYSLIP,
     * GUARANTOR_EMPLOYMENT_CONTRACT, GUARANTOR_TAX_RETURN,
     * INCOME_CORRECTION (dati reddituali da correggere)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "requested_items", columnDefinition = "jsonb")
    private List<String> requestedItems;

    /**
     * PENDING  → inviata, in attesa di risposta del tenant
     * REPLIED  → il tenant ha caricato/compilato qualcosa
     * RESOLVED → il supervisore ha chiuso la richiesta
     */
    @Builder.Default
    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @CreationTimestamp
    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;

    @Column(name = "tenant_replied_at")
    private LocalDateTime tenantRepliedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
