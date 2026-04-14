package com.inquilino.entity;

import com.inquilino.enums.ContractType;
import com.inquilino.enums.EmploymentType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Garante generico associato a un profilo tenant.
 *
 * Non è vincolato al tipo di relazione familiare: può essere un genitore,
 * un coniuge, un conoscente, un datore di lavoro, ecc.
 * La distinzione UX (es. "Aggiungi genitore" per gli studenti) è gestita
 * dal frontend; il backend tratta tutti i garanti allo stesso modo.
 *
 * I dati economici del garante alimentano sia il calcolo di income_stability
 * (Fattore D) sia rent_sustainability (credito reddito garante).
 */
@Entity
@Table(name = "guarantors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Guarantor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Profilo tenant a cui appartiene questo garante */
    @Column(name = "tenant_profile_id", nullable = false)
    private UUID tenantProfileId;

    /**
     * Etichetta libera che descrive il ruolo del garante.
     * Esempi: "Padre", "Madre", "Coniuge", "Datore di lavoro", ecc.
     * Usata solo per visualizzazione; non influenza l'algoritmo.
     */
    @Column(name = "role_label", length = 100)
    private String roleLabel;

    // ─── Anagrafica ───────────────────────────────────────────────────────────

    @Column(name = "full_name", length = 200)
    private String fullName;

    @Column(name = "fiscal_code", length = 20)
    private String fiscalCode;

    // ─── Dati lavorativi ──────────────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_type", length = 30)
    private EmploymentType employmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", length = 30)
    private ContractType contractType;

    @Column(name = "employment_start_date")
    private LocalDate employmentStartDate;

    /** Valorizzato solo per FIXED_TERM: data di scadenza del contratto */
    @Column(name = "employment_end_date")
    private LocalDate employmentEndDate;

    // ─── Dati reddituali ──────────────────────────────────────────────────────

    /** Reddito mensile netto dichiarato dal tenant o dal supervisore */
    @Column(name = "declared_monthly_income", precision = 10, scale = 2)
    private BigDecimal declaredMonthlyIncome;

    /**
     * Reddito mensile netto verificato dal supervisore tramite documenti.
     * Se null, l'algoritmo usa declaredMonthlyIncome.
     */
    @Column(name = "verified_monthly_income", precision = 10, scale = 2)
    private BigDecimal verifiedMonthlyIncome;

    @Builder.Default
    @Column(name = "income_verified", nullable = false)
    private boolean incomeVerified = false;

    // ─── Metadata ─────────────────────────────────────────────────────────────

    /** ID dell'utente che ha inserito i dati (supervisor o tenant) */
    @Column(name = "entered_by")
    private UUID enteredBy;

    /** "SUPERVISOR" | "TENANT" */
    @Column(name = "entered_by_role", length = 20)
    private String enteredByRole;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
