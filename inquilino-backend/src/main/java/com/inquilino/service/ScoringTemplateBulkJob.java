package com.inquilino.service;

import com.inquilino.entity.TenantProfile;
import com.inquilino.enums.VerificationStatus;
import com.inquilino.repository.TenantProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Background job per ricalcolare i match di tutti i profili VERIFIED
 * collegati a un template dopo che quel template è stato aggiornato.
 *
 * Separato da ScoringTemplateService per rispettare il proxy di Spring
 * (le chiamate @Async da una bean a se stessa non passano per il proxy).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ScoringTemplateBulkJob {

    private final TenantProfileRepository profileRepo;
    private final MatchingService          matchingService;
    private final NotificationService      notificationService;

    @Async
    public void recalculateForTemplate(UUID templateId, String templateName, UUID superadminId) {
        List<TenantProfile> profiles = profileRepo
                .findByScoringTemplateIdAndVerificationStatus(templateId, VerificationStatus.VERIFIED);

        log.info("Bulk recalc for template '{}' ({}): {} profili VERIFIED",
                templateName, templateId, profiles.size());

        int success = 0;
        for (TenantProfile profile : profiles) {
            try {
                matchingService.computeMatchesForTenant(profile.getId());
                success++;
            } catch (Exception e) {
                log.error("Errore ricalcolo match per profilo {}: {}", profile.getId(), e.getMessage(), e);
            }
        }

        log.info("Bulk recalc completato: {}/{} profili ricalcolati", success, profiles.size());
        notificationService.notifySuperadminBulkRecalcComplete(superadminId, templateName, success);
    }
}
