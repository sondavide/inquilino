package com.inquilino.controller;

import com.inquilino.dto.public_.AgencyContactRequest;
import com.inquilino.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private static final String CONTACT_EMAIL = "info@inquilinofacile.it";

    private final EmailService emailService;

    @Value("${app.vapid.public-key:}")
    private String vapidPublicKey;

    /** Restituisce la configurazione pubblica della piattaforma (chiavi pubbliche, feature flags). */
    @GetMapping("/config")
    public ResponseEntity<java.util.Map<String, String>> config() {
        return ResponseEntity.ok(java.util.Map.of("vapidPublicKey", vapidPublicKey));
    }

    /**
     * Receives a partnership enquiry from an agency or professional on the landing page.
     * Forwards the details to the internal contact email.
     * No authentication required — rate limiting should be applied at the reverse proxy level.
     */
    @PostMapping("/agency-contact")
    public ResponseEntity<Void> agencyContact(@Valid @RequestBody AgencyContactRequest req) {
        String subject = "[InquilinoFacile] Richiesta partnership agenzia: " + req.agencyName();
        String body = """
                Nuova richiesta di partnership ricevuta dalla landing page.

                Nome:    %s
                Email:   %s
                Agenzia: %s
                Città:   %s

                Messaggio:
                %s
                """.formatted(req.name(), req.email(), req.agencyName(), req.city(),
                req.message() != null ? req.message() : "(nessun messaggio)");

        emailService.send(CONTACT_EMAIL, subject, body);
        return ResponseEntity.ok().build();
    }
}
