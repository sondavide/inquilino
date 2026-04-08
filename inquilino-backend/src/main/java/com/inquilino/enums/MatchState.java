package com.inquilino.enums;

public enum MatchState {
    /** Match algoritmico — nessuna parte ha ancora espresso interesse. */
    ALGORITHMIC,
    /** Solo l'inquilino ha espresso interesse. */
    TENANT_INTERESTED,
    /** Solo il locatore ha espresso interesse / inviato invito. */
    LANDLORD_INTERESTED,
    /** Entrambe le parti hanno espresso interesse (match reciproco). */
    MUTUAL_INTEREST,
    /** Contatti sbloccati — entrambe le parti possono vedersi i dati completi. */
    CONTACT_UNLOCKED,
    /** Match archiviato (rifiuto o annuncio rimosso). */
    ARCHIVED
}
