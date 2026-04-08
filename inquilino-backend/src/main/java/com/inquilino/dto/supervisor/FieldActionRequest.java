package com.inquilino.dto.supervisor;

public record FieldActionRequest(
        /** Nota libera del supervisore — obbligatoria per FLAGGED */
        String note
) {}
