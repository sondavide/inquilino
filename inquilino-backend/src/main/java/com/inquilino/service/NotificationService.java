package com.inquilino.service;

import com.inquilino.entity.ProfileNotification;
import com.inquilino.repository.ProfileNotificationRepository;
import com.inquilino.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Crea notifiche in-app, invia email e push in modo coordinato.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final ProfileNotificationRepository notificationRepo;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final WebPushService webPushService;

    /**
     * Notifica l'utente che ci sono campi del profilo da correggere.
     */
    public void notifyUserCorrectionRequired(UUID userId) {
        String title   = "Profilo da correggere";
        String message = "Il tuo profilo contiene dati da correggere. Accedi alla piattaforma per vedere i dettagli.";

        saveInApp(userId, "CORRECTION_REQUESTED", title, message);

        userRepository.findById(userId).ifPresent(user ->
                emailService.send(user.getEmail(), title, message));

        webPushService.sendToUser(userId, title, message);
    }

    /**
     * Notifica il supervisore che il tenant ha corretto tutti i campi
     * e il profilo è tornato in coda di validazione.
     */
    public void notifySupervisorProfileReady(UUID supervisorId, String tenantName) {
        String title   = "Profilo pronto per la revisione";
        String message = String.format("Il tenant %s ha corretto i dati segnalati. Il profilo è pronto per essere revisionato.", tenantName);

        saveInApp(supervisorId, "BACK_IN_VALIDATION", title, message);
        webPushService.sendToUser(supervisorId, title, message);
    }

    /**
     * Notifica l'utente che il profilo è stato completamente validato.
     */
    public void notifyUserProfileVerified(UUID userId) {
        String title   = "Profilo verificato!";
        String message = "Il tuo profilo è stato verificato con successo ed è ora visibile ai locatori.";

        saveInApp(userId, "PROFILE_VERIFIED", title, message);

        userRepository.findById(userId).ifPresent(user ->
                emailService.send(user.getEmail(), title, message));

        webPushService.sendToUser(userId, title, message);
    }

    // ─── Notifiche annunci immobiliari ────────────────────────────────────────

    public void notifyListingPublished(UUID userId) {
        String title   = "Annuncio pubblicato!";
        String message = "Il tuo annuncio è stato verificato e pubblicato con successo.";
        saveInApp(userId, "LISTING_PUBLISHED", title, message);
        userRepository.findById(userId).ifPresent(u -> emailService.send(u.getEmail(), title, message));
        webPushService.sendToUser(userId, title, message);
    }

    public void notifyListingRejected(UUID userId) {
        String title   = "Annuncio da correggere";
        String message = "Il tuo annuncio contiene dati da correggere. Accedi alla piattaforma per vedere i dettagli.";
        saveInApp(userId, "LISTING_REJECTED", title, message);
        userRepository.findById(userId).ifPresent(u -> emailService.send(u.getEmail(), title, message));
        webPushService.sendToUser(userId, title, message);
    }

    public void notifySupervisorListingReady(UUID supervisorId, String listingTitle) {
        String title   = "Annuncio pronto per revisione";
        String message = String.format("L'annuncio \"%s\" è stato corretto ed è pronto per la revisione.", listingTitle);
        saveInApp(supervisorId, "LISTING_BACK_IN_REVIEW", title, message);
        webPushService.sendToUser(supervisorId, title, message);
    }

    // ─── Notifiche matching ───────────────────────────────────────────────────

    public void notifyMutualMatch(UUID userId, java.util.UUID matchId, boolean isTenant) {
        String title;
        String message;
        if (isTenant) {
            title   = "Nuovo match reciproco!";
            message = "Un locatore è interessato al tuo profilo. Puoi ora chattare e sbloccare i contatti.";
        } else {
            title   = "Nuovo match reciproco!";
            message = "Un inquilino ha risposto al tuo interesse. Puoi ora sbloccare i contatti.";
        }
        saveInApp(userId, "MATCH_MUTUAL", title, message);
        webPushService.sendToUser(userId, title, message);
    }

    public void notifyContactUnlocked(UUID userId) {
        String title   = "Contatti sbloccati!";
        String message = "Puoi ora vedere i dati di contatto completi per questo match.";
        saveInApp(userId, "MATCH_CONTACT_UNLOCKED", title, message);
        webPushService.sendToUser(userId, title, message);
    }

    /**
     * Notifica il superadmin al termine del ricalcolo bulk dei match
     * seguito all'aggiornamento di un template di scoring.
     */
    public void notifySuperadminBulkRecalcComplete(UUID superadminId, String templateName, int profileCount) {
        String title   = "Ricalcolo completato";
        String message = String.format(
                "Template \"%s\": %d profili ricalcolati con i nuovi pesi.",
                templateName, profileCount);
        saveInApp(superadminId, "BULK_RECALC_COMPLETE", title, message);
    }

    // ─── Notifiche agenzia ────────────────────────────────────────────────────

    public void notifyAgencyApproved(UUID agencyUserId) {
        String title   = "Agenzia approvata!";
        String message = "Il tuo profilo agenzia è stato approvato. Puoi ora pubblicare annunci immobiliari.";
        saveInApp(agencyUserId, "AGENCY_APPROVED", title, message);
        userRepository.findById(agencyUserId).ifPresent(u -> emailService.send(u.getEmail(), title, message));
        webPushService.sendToUser(agencyUserId, title, message);
    }

    public void notifyAgencyRejected(UUID agencyUserId, String note) {
        String title   = "Profilo agenzia: correzioni richieste";
        String message = "La registrazione della tua agenzia richiede delle correzioni."
                + (note != null && !note.isBlank() ? " Nota: " + note : "");
        saveInApp(agencyUserId, "AGENCY_REJECTED", title, message);
        userRepository.findById(agencyUserId).ifPresent(u -> emailService.send(u.getEmail(), title, message));
    }

    public void notifyAgencySuspended(UUID agencyUserId, String note) {
        String title   = "Agenzia sospesa";
        String message = "Il tuo account agenzia è stato sospeso."
                + (note != null && !note.isBlank() ? " Motivo: " + note : "");
        saveInApp(agencyUserId, "AGENCY_SUSPENDED", title, message);
        userRepository.findById(agencyUserId).ifPresent(u -> emailService.send(u.getEmail(), title, message));
    }

    /** Notifica l'agenzia quando un profilo mette like ad un annuncio. */
    public void notifyAgencyTenantInterested(UUID agencyUserId, String listingTitle) {
        String title   = "Nuovo profilo interessato";
        String message = String.format("Un profilo verificato ha messo like all'annuncio \"%s\". Puoi vederlo nella rubrica.", listingTitle);
        saveInApp(agencyUserId, "AGENCY_TENANT_INTERESTED", title, message);
        userRepository.findById(agencyUserId).ifPresent(u -> emailService.send(u.getEmail(), title, message));
        webPushService.sendToUser(agencyUserId, title, message);
    }

    private void saveInApp(UUID userId, String type, String title, String message) {
        notificationRepo.save(ProfileNotification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .build());
    }
}
