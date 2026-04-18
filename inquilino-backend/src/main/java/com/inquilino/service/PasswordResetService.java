package com.inquilino.service;

import com.inquilino.entity.User;
import com.inquilino.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Gestisce il reset password tramite token monouso inviato per email.
 * Lo stato è in-memory — sufficiente per ora (single-instance dev).
 * Sostituire con tabella DB prima di scalare orizzontalmente.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    private record ResetEntry(String userId, Instant expiresAt) {}
    private final ConcurrentHashMap<String, ResetEntry> pending = new ConcurrentHashMap<>();
    private final SecureRandom rnd = new SecureRandom();

    private static final int EXPIRY_MINUTES = 30;

    /**
     * Se l'email esiste, genera un token e invia un link di reset.
     * Non rivela mai se l'email è registrata o meno (no enumeration).
     */
    public void requestReset(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase().trim());
        if (userOpt.isEmpty()) {
            // No enumeration: logga solo internamente, nessuna risposta diversa al client
            log.info("Richiesta reset password per email non registrata: {}", email);
            return;
        }
        User user = userOpt.get();
        if (user.getPasswordHash() == null) {
            // Utente OAuth — non ha una password locale
            log.info("Richiesta reset password per utente OAuth ({}): ignorata", email);
            emailService.send(
                email,
                "InquilinoFacile – Reset password non disponibile",
                "Il tuo account è collegato a " + user.getProvider() +
                ".\nAccedi usando il pulsante \"Continua con " + user.getProvider() + "\"."
            );
            return;
        }

        // Genera token sicuro (32 byte hex = 64 caratteri)
        byte[] bytes = new byte[32];
        rnd.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        pending.put(token, new ResetEntry(user.getId().toString(), Instant.now().plusSeconds(EXPIRY_MINUTES * 60L)));

        String resetLink = frontendUrl + "/reset-password?token=" + token;
        emailService.send(
            email,
            "InquilinoFacile – Reimposta la tua password",
            "Hai richiesto di reimpostare la password del tuo account InquilinoFacile.\n\n" +
            "Clicca sul link qui sotto (valido per " + EXPIRY_MINUTES + " minuti):\n" +
            resetLink + "\n\n" +
            "Se non hai richiesto il reset, ignora questa email. La tua password rimane invariata."
        );
        log.info("Link di reset password inviato a {}", email);
    }

    /**
     * Genera un token di impostazione password per un operatore appena invitato.
     * Riutilizza il flusso di reset, senza verificare se l'utente ha già una password.
     */
    public void sendOperatorInvite(User operator, String invitedByAgencyName) {
        byte[] bytes = new byte[32];
        rnd.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        pending.put(token, new ResetEntry(operator.getId().toString(),
                Instant.now().plusSeconds(72 * 60 * 60L))); // 72h

        String setupLink = frontendUrl + "/reset-password?token=" + token;
        emailService.send(
            operator.getEmail(),
            "InquilinoFacile – Sei stato invitato come operatore",
            "Sei stato aggiunto come operatore dell'agenzia \"" + invitedByAgencyName + "\" su InquilinoFacile.\n\n" +
            "Imposta la tua password cliccando il link qui sotto (valido per 72 ore):\n" +
            setupLink + "\n\n" +
            "Se ritieni di aver ricevuto questa email per errore, ignorala."
        );
        log.info("Invito operatore inviato a {}", operator.getEmail());
    }

    /**
     * Valida il token e aggiorna la password.
     * @return true se il reset è riuscito, false se il token è scaduto/inesistente
     */
    @Transactional
    public boolean resetPassword(String token, String newPassword) {
        if (token == null || newPassword == null) return false;
        ResetEntry entry = pending.get(token);
        if (entry == null) return false;
        if (Instant.now().isAfter(entry.expiresAt())) {
            pending.remove(token);
            log.warn("Token di reset scaduto: {}", token);
            return false;
        }
        Optional<User> userOpt = userRepository.findById(java.util.UUID.fromString(entry.userId()));
        if (userOpt.isEmpty()) {
            pending.remove(token);
            return false;
        }
        User user = userOpt.get();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        pending.remove(token);
        log.info("Password reimpostata per utente {}", user.getEmail());
        return true;
    }
}
