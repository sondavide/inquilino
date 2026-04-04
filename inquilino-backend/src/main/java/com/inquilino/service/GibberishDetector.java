package com.inquilino.service;

import org.springframework.stereotype.Component;

import java.util.Arrays;

/**
 * Lightweight heuristic detector for random/gibberish chat input.
 *
 * Score 0.0 = clean text, 1.0 = clearly gibberish.
 * Threshold for "gibberish" is >= 0.65.
 *
 * Does NOT call the LLM — intentionally cheap to run on every message.
 */
@Component
public class GibberishDetector {

    private static final String VOWELS = "aeiouàèéìòùäöüáíóú";

    /** Returns true when the text is clearly random/meaningless input. */
    public boolean isGibberish(String text) {
        return score(text) >= 0.65;
    }

    /** Returns a spam score in [0.0, 1.0]. */
    public double score(String text) {
        if (text == null || text.isBlank()) return 0.0;
        String s = text.toLowerCase().trim();
        if (s.length() < 4) return 0.0; // too short to judge reliably

        double score = 0.0;

        // ── 1. Vowel ratio among alphabetic characters ──────────────────────
        long letters = s.chars().filter(Character::isLetter).count();
        if (letters >= 4) {
            long vowels = s.chars().filter(c -> VOWELS.indexOf(c) >= 0).count();
            double vowelRatio = (double) vowels / letters;
            if (vowelRatio < 0.10) score += 0.40;
            else if (vowelRatio < 0.20) score += 0.20;
        }

        // ── 2. Maximum consecutive consonants ───────────────────────────────
        int maxConsec = maxConsecutiveConsonants(s);
        if (maxConsec >= 6) score += 0.30;
        else if (maxConsec >= 4) score += 0.15;

        // ── 3. Ratio of space-separated tokens that have no vowels ──────────
        String[] tokens = s.split("\\s+");
        long letterTokens = Arrays.stream(tokens)
                .filter(w -> letterCount(w) >= 3)
                .count();
        if (letterTokens > 0) {
            long noVowelTokens = Arrays.stream(tokens)
                    .filter(w -> letterCount(w) >= 3)
                    .filter(w -> vowelCount(w) == 0)
                    .count();
            if ((double) noVowelTokens / letterTokens > 0.6) score += 0.25;
        }

        // ── 4. Repetitive pattern (e.g. "aaa", "ababab", "qwrqwr") ─────────
        if (isRepetitive(s.replace(" ", ""))) score += 0.20;

        return Math.min(score, 1.0);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private int maxConsecutiveConsonants(String s) {
        int max = 0, cur = 0;
        for (char c : s.toCharArray()) {
            if (Character.isLetter(c) && VOWELS.indexOf(c) < 0) {
                max = Math.max(max, ++cur);
            } else {
                cur = 0;
            }
        }
        return max;
    }

    private long letterCount(String w) {
        return w.chars().filter(Character::isLetter).count();
    }

    private long vowelCount(String w) {
        return w.chars().filter(c -> VOWELS.indexOf(c) >= 0).count();
    }

    /** True when the string is made of a short repeated sub-pattern (min 3 repetitions). */
    private boolean isRepetitive(String s) {
        if (s.length() < 4) return false;
        for (int len = 1; len <= s.length() / 3; len++) {
            String pattern = s.substring(0, len);
            boolean match = true;
            for (int i = len; i < s.length(); i++) {
                if (s.charAt(i) != pattern.charAt(i % len)) { match = false; break; }
            }
            if (match) return true;
        }
        return false;
    }
}
