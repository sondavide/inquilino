package com.inquilino.enums;

public enum MatchBand {
    /** score >= 85 */
    EXCELLENT_MATCH,
    /** score 70–84 */
    GOOD_MATCH,
    /** score 55–69 */
    MEDIUM_MATCH,
    /** score 40–54 */
    WEAK_MATCH
    // Sotto 40: match non salvato o non mostrato in UI
}
