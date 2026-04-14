package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Template di scoring che configura pesi e soglie dell'algoritmo di affidabilità.
 *
 * I template controllano due livelli:
 *
 * 1. PESI FORZA-TENANT (weightIdentity … weightGuarantor)
 *    Raw integers ≥ 0, normalizzati a 100 in MatchingService.calcTenantStrength().
 *    Definiscono l'importanza relativa di ciascun fattore nel punteggio di matching.
 *
 * 2. PARAMETRI ALGORITMO DI SCORING (doc weights, soglie, percentuali)
 *    Usati direttamente da ScoringService per calcolare i tre indicatori categoriali.
 *    - document_reliability: pesi per tipo documento + bonus tre buste paga
 *    - income_stability: soglie HIGH/MEDIUM + peso famiglia per studenti
 *    - rent_sustainability: soglie percentuali + credito reddito garante
 *
 * Live-link: i profili mantengono un FK al template. Quando il template
 * viene aggiornato, un job ricalcola in background tutti i profili VERIFIED collegati.
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

    // ═══════════════════════════════════════════════════════════════════════════
    // PESI FORZA-TENANT (usati in MatchingService)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Peso per documento d'identità approvato dal supervisore */
    @Builder.Default
    @Column(name = "weight_identity", nullable = false)
    private int weightIdentity = 20;

    /** Peso per documento di reddito approvato (busta paga o 730) */
    @Builder.Default
    @Column(name = "weight_income", nullable = false)
    private int weightIncome = 20;

    /** Peso per stabilità reddituale (calcolata da ScoringService) */
    @Builder.Default
    @Column(name = "weight_stability", nullable = false)
    private int weightStability = 20;

    /** Peso per affidabilità documentale complessiva */
    @Builder.Default
    @Column(name = "weight_documents", nullable = false)
    private int weightDocuments = 20;

    /** Peso per presenza di garante */
    @Builder.Default
    @Column(name = "weight_guarantor", nullable = false)
    private int weightGuarantor = 20;

    // ═══════════════════════════════════════════════════════════════════════════
    // PESI PER TIPO DOCUMENTO (usati in ScoringService.documentReliability)
    // Ogni tipo approvato dal supervisore contribuisce con il proprio peso.
    // Il totale è cappato a 100 → HIGH/MEDIUM/LOW in base alle soglie sotto.
    // ═══════════════════════════════════════════════════════════════════════════

    /** Documento d'identità (carta d'identità, passaporto) */
    @Builder.Default
    @Column(name = "doc_weight_identity", nullable = false)
    private int docWeightIdentity = 10;

    /** Busta paga singola */
    @Builder.Default
    @Column(name = "doc_weight_payslip", nullable = false)
    private int docWeightPayslip = 15;

    /** Bonus aggiuntivo se sono presenti 3 o più buste paga consecutive approvate */
    @Builder.Default
    @Column(name = "doc_weight_payslip_triple_bonus", nullable = false)
    private int docWeightPayslipTripleBonus = 15;

    /** Dichiarazione dei redditi 730 o CU */
    @Builder.Default
    @Column(name = "doc_weight_tax_return", nullable = false)
    private int docWeightTaxReturn = 25;

    /** Contratto di lavoro */
    @Builder.Default
    @Column(name = "doc_weight_employment_contract", nullable = false)
    private int docWeightEmploymentContract = 20;

    /** Estratto conto bancario */
    @Builder.Default
    @Column(name = "doc_weight_bank_statement", nullable = false)
    private int docWeightBankStatement = 15;

    /** Referenza da locatore precedente */
    @Builder.Default
    @Column(name = "doc_weight_landlord_reference", nullable = false)
    private int docWeightLandlordReference = 20;

    /** Documento del garante (generico) */
    @Builder.Default
    @Column(name = "doc_weight_guarantor_document", nullable = false)
    private int docWeightGuarantorDocument = 15;

    // ═══════════════════════════════════════════════════════════════════════════
    // SOGLIE document_reliability
    // ═══════════════════════════════════════════════════════════════════════════

    /** Punteggio documento minimo per livello HIGH */
    @Builder.Default
    @Column(name = "doc_reliability_high_threshold", nullable = false)
    private int docReliabilityHighThreshold = 60;

    /** Punteggio documento minimo per livello MEDIUM */
    @Builder.Default
    @Column(name = "doc_reliability_medium_threshold", nullable = false)
    private int docReliabilityMediumThreshold = 30;

    // ═══════════════════════════════════════════════════════════════════════════
    // SOGLIE income_stability (punteggio sommatoria A+B+C+D, max 100)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Punteggio minimo per livello HIGH */
    @Builder.Default
    @Column(name = "stability_high_threshold", nullable = false)
    private int stabilityHighThreshold = 65;

    /** Punteggio minimo per livello MEDIUM */
    @Builder.Default
    @Column(name = "stability_medium_threshold", nullable = false)
    private int stabilityMediumThreshold = 35;

    /**
     * Percentuale (0-100) del family_score nel calcolo combinato per gli STUDENT.
     * Il restante (100 - studentFamilyWeightPct) è il peso dello student_score.
     * Default 70 → combined = student_score*0.30 + family_score*0.70
     */
    @Builder.Default
    @Column(name = "student_family_weight_pct", nullable = false)
    private int studentFamilyWeightPct = 70;

    // ═══════════════════════════════════════════════════════════════════════════
    // SOGLIE rent_sustainability
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Soglia percentuale (0-100) max_budget/reddito_effettivo per livello HIGH.
     * Default 30 → affitto ≤ 30% reddito = HIGH
     */
    @Builder.Default
    @Column(name = "rent_high_threshold_pct", nullable = false)
    private int rentHighThresholdPct = 30;

    /**
     * Soglia percentuale per livello MEDIUM.
     * Default 50 → affitto 30–50% = MEDIUM, >50% = LOW
     */
    @Builder.Default
    @Column(name = "rent_medium_threshold_pct", nullable = false)
    private int rentMediumThresholdPct = 50;

    /**
     * Percentuale (0-100) del reddito del garante che contribuisce al reddito effettivo.
     * Default 40 → effective_income += guarantor_income * 0.40
     */
    @Builder.Default
    @Column(name = "guarantor_income_credit_pct", nullable = false)
    private int guarantorIncomeCreditPct = 40;

    // ═══════════════════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════════════════

    /** Quando true questo template è usato per i profili senza template esplicito */
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
