package com.inquilino.dto.supervisor;

/**
 * Request body for PUT /supervisor/profiles/{id}/score-override.
 * Each field is nullable: null means "remove the override for this indicator".
 * Pass all three fields every time (even if unchanged) so the server can do a full replace.
 */
public record ScoreOverrideRequest(
        String rentSustainability,    // HIGH | MEDIUM | LOW | null
        String incomeStability,
        String documentReliability,
        String reason
) {}
