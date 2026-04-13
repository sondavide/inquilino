package com.inquilino.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Classifica l'input dell'utente come spam/gibberish delegando a GPT-4o-mini.
 *
 * Il prompt richiede una risposta di esattamente una parola (SPAM | OK),
 * quindi la chiamata è molto economica (~1 output token) e veloce.
 *
 * In caso di errore o risposta inattesa il metodo è permissivo (ritorna false)
 * per non bloccare utenti legittimi per un problema temporaneo dell'API.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GibberishDetector {

    private final ChatClient chatClient;

    private static final String PROMPT = """
            You are a spam classifier for a chat application.
            Classify the following user message as SPAM or OK.

            SPAM examples: random keyboard mashing ("asdfghjkl", "qqqqqq", "zxcvbnm"), \
            repetitive nonsense ("aaaaaaa", "123123123"), promotional content ("buy bitcoin", \
            "click here"), offensive slurs, or any input that is clearly not a real answer to \
            a housing-related question.

            OK examples: any real answer in Italian or English — even short ones like "sì", "no", \
            "non lo so", "300", "Milano", a date, a number, a sentence, or a greeting.
            When in doubt, respond OK.

            Reply with exactly one word: SPAM or OK.

            Message: "%s"
            """;

    /**
     * Patterns that must never be classified as spam regardless of their appearance.
     * Checked before the LLM call to avoid false positives and save tokens.
     */
    private static final List<Pattern> WHITELIST_PATTERNS = List.of(
            // Italian fiscal code: 6 letters + 2 digits + 1 letter + 2 digits + 1 letter + 3 digits + 1 letter
            Pattern.compile("^[A-Z]{6}\\d{2}[A-Z]\\d{2}[A-Z]\\d{3}[A-Z]$", Pattern.CASE_INSENSITIVE),
            // Pure numeric input (dates, amounts, phone numbers, counts)
            Pattern.compile("^[\\d\\s.,:/-]+$"),
            // Date-like patterns: dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
            Pattern.compile("^\\d{1,4}[/\\-.]\\d{1,2}[/\\-.]\\d{1,4}$"),
            // Short word-only answers (city names, country names, single words)
            Pattern.compile("^[\\p{L}\\s''-]{2,50}$"),
            // IBAN / account codes: letters+digits mix typical of banking codes
            Pattern.compile("^[A-Z]{2}\\d{2}[A-Z0-9]{10,30}$", Pattern.CASE_INSENSITIVE),
            // "sì", "no", "si", "non so" and other short affirmative/negative answers
            Pattern.compile("^(s[iì]|no|forse|ok|okay|non lo so|non so|va bene|certo|esatto|corretto|sbagliato)$",
                    Pattern.CASE_INSENSITIVE)
    );

    /**
     * Returns true when the message is classified as spam/gibberish by the LLM.
     * Falls back to false (permissive) if the API call fails.
     */
    public boolean isGibberish(String text) {
        if (text == null || text.isBlank() || text.length() < 4) return false;

        // Fast path: if the message matches a known-valid pattern, skip the LLM call
        String trimmed = text.strip();
        for (Pattern p : WHITELIST_PATTERNS) {
            if (p.matcher(trimmed).matches()) return false;
        }
        try {
            String response = chatClient.prompt()
                    .user(PROMPT.formatted(sanitize(text)))
                    .call()
                    .content();
            if (response == null) return false;
            return response.strip().toUpperCase().startsWith("SPAM");
        } catch (Exception e) {
            log.warn("GibberishDetector: AI call failed, allowing message through. Cause: {}", e.getMessage());
            return false;
        }
    }

    /** Strips control characters and truncates to avoid prompt injection. */
    private String sanitize(String text) {
        String safe = text.replaceAll("[\\p{Cntrl}]", " ").trim();
        return safe.length() > 300 ? safe.substring(0, 300) + "…" : safe;
    }
}
