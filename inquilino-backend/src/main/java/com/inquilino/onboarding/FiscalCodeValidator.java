package com.inquilino.onboarding;

/**
 * Validates an Italian Codice Fiscale using the official checksum algorithm
 * defined by the Ministero delle Finanze (D.M. 23/12/1976).
 */
public final class FiscalCodeValidator {

    private FiscalCodeValidator() {}

    // Values for characters in ODD positions (1st, 3rd, 5th, ... — 1-indexed)
    private static final int[] ODD = {
        1, 0, 5, 7, 9, 13, 15, 17, 19, 21,  // 0–9
        1, 0, 5, 7, 9, 13, 15, 17, 19, 21,  // A–J
        2, 4, 18, 20, 11, 3, 6, 8, 12, 14,  // K–T
        16, 10, 22, 25, 24, 23              // U–Z
    };

    /**
     * Returns true if {@code cf} is a syntactically and checksally valid
     * Italian Codice Fiscale (standard 16-character format).
     * Omocodia substitutions are NOT supported — the plain numeric form is expected.
     */
    public static boolean isValid(String cf) {
        if (cf == null) return false;
        String s = cf.trim().toUpperCase();

        // Basic format: 6 letters, 2 digits, 1 letter, 2 digits, 1 letter, 3 digits, 1 letter
        if (!s.matches("[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]")) return false;

        int sum = 0;
        for (int i = 0; i < 15; i++) {
            char c = s.charAt(i);
            if (i % 2 == 0) {
                // Odd position (1-indexed): use ODD table.
                // Digits map to indices 0-9; letters A-Z map to indices 10-35.
                int idx = Character.isDigit(c) ? (c - '0') : (c - 'A' + 10);
                sum += ODD[idx];
            } else {
                // Even position (1-indexed): value is digit face value or letter ordinal (A=0).
                sum += Character.isDigit(c) ? (c - '0') : (c - 'A');
            }
        }

        char expected = (char) ('A' + sum % 26);
        return s.charAt(15) == expected;
    }
}
