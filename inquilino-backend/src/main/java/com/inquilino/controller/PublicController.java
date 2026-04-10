package com.inquilino.controller;

import com.inquilino.dto.public_.AgencyContactRequest;
import com.inquilino.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private static final String CONTACT_EMAIL = "info@inquilinofacile.it";

    private final EmailService emailService;

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
