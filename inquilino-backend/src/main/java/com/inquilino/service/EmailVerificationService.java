package com.inquilino.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gestisce la verifica email tramite OTP a 6 cifre.
 * Lo stato è in-memory — sufficiente per ora (single-instance dev).
 * Sostituire con Redis o tabella DB prima di scalare orizzontalmente.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationService {

    private final EmailService emailService;

    private record Entry(String code, Instant expiresAt) {}
    private final ConcurrentHashMap<String, Entry> pending = new ConcurrentHashMap<>();
    private final SecureRandom rnd = new SecureRandom();

    private static final int EXPIRY_MINUTES = 10;

    /**
     * Genera e invia un codice OTP all'indirizzo email.
     * Se esiste già un codice per quell'email viene sovrascritto (utile per il re-invio).
     */
    public void requestVerification(String email) {
        String code = String.format("%06d", rnd.nextInt(1_000_000));
        pending.put(email.toLowerCase(), new Entry(code, Instant.now().plusSeconds(EXPIRY_MINUTES * 60L)));

        emailService.send(
            email,
            "InquilinoFacile – Codice di verifica",
            "Il tuo codice di verifica è: " + code +
            "\n\nIl codice è valido per " + EXPIRY_MINUTES + " minuti.\n\n" +
            "Se non hai richiesto la registrazione su InquilinoFacile, ignora questa email."
        );
        log.info("Codice di verifica inviato a {}", email);
    }

    /**
     * Valida e consuma il codice OTP (monouso).
     * @return true se il codice è corretto e non scaduto
     */
    public boolean verifyAndConsume(String email, String code) {
        if (email == null || code == null) return false;
        Entry entry = pending.get(email.toLowerCase());
        if (entry == null) return false;
        if (Instant.now().isAfter(entry.expiresAt())) {
            pending.remove(email.toLowerCase());
            log.warn("Codice scaduto per {}", email);
            return false;
        }
        if (!entry.code().equals(code.trim())) return false;
        pending.remove(email.toLowerCase());
        return true;
    }
}
