package com.inquilino.enums;

public enum FieldValidationStatus {
    /** Il campo non è ancora stato esaminato dal supervisore */
    PENDING,
    /** Il supervisore ha approvato il campo — non modificabile dall'utente */
    APPROVED,
    /** Il supervisore ha segnalato un errore — l'utente deve correggere */
    FLAGGED
}
