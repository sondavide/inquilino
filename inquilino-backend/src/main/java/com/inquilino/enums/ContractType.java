package com.inquilino.enums;

/**
 * Tipo di contratto di lavoro.
 * Usato sia per il TenantProfile che per il Guarantor.
 * Determina il punteggio di Fattore A nell'algoritmo income_stability.
 */
public enum ContractType {
    /** Contratto a tempo indeterminato */
    PERMANENT,
    /** Contratto a tempo determinato (richiede employmentEndDate) */
    FIXED_TERM,
    /** Contratto di apprendistato */
    APPRENTICESHIP,
    /** Stage o tirocinio */
    INTERNSHIP,
    /** Prestazione occasionale o partita IVA (usato per SELF_EMPLOYED) */
    FREELANCE,
    OTHER
}
