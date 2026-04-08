package com.inquilino.enums;

public enum VerificationStatus {
    /** Onboarding non avviato */
    NONE,
    /** Onboarding in corso */
    PARTIAL,
    /** Onboarding completato, in attesa di un supervisore */
    PENDING_VALIDATION,
    /** Un supervisore ha aperto il profilo e lo sta esaminando */
    IN_VALIDATION,
    /** Il supervisore ha segnalato errori — l'utente deve correggere */
    NEEDS_CORRECTION,
    /** Profilo completamente validato */
    VERIFIED
}
