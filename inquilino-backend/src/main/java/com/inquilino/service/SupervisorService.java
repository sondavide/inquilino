package com.inquilino.service;

import com.inquilino.entity.*;
import com.inquilino.enums.*;
import com.inquilino.repository.*;
import com.inquilino.security.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupervisorService {

    private final TenantProfileRepository profileRepo;
    private final FieldValidationRepository fieldValidationRepo;
    private final ProfileAuditLogRepository auditLogRepo;
    private final NotificationService notificationService;
    private final UserService userService;
    private final MatchingService matchingService;

    // ─── Lista profili ────────────────────────────────────────────────────────

    public List<TenantProfile> getProfilesByStatuses(List<VerificationStatus> statuses) {
        return profileRepo.findByVerificationStatusIn(statuses);
    }

    public Page<TenantProfile> getProfilesByStatusesPaged(List<VerificationStatus> statuses, Pageable pageable) {
        return profileRepo.findByVerificationStatusIn(statuses, pageable);
    }

    // ─── Apertura profilo (IN_VALIDATION) ────────────────────────────────────

    @Transactional
    public TenantProfile openProfile(UUID tenantProfileId, UUID supervisorId) {
        TenantProfile profile = getProfile(tenantProfileId);
        if (profile.getVerificationStatus() == VerificationStatus.PENDING_VALIDATION) {
            profile.setVerificationStatus(VerificationStatus.IN_VALIDATION);
            profile.setAssignedSupervisorId(supervisorId);
            profileRepo.save(profile);
            logStatusChange(tenantProfileId, supervisorId, "SUPERVISOR",
                    VerificationStatus.PENDING_VALIDATION, VerificationStatus.IN_VALIDATION);
        }
        return profile;
    }

    // ─── Approva campo ────────────────────────────────────────────────────────

    @Transactional
    public FieldValidation approveField(UUID tenantProfileId, String fieldName, UUID supervisorId) {
        FieldValidation fv = upsertValidation(tenantProfileId, fieldName, supervisorId,
                FieldValidationStatus.APPROVED, null);
        audit(tenantProfileId, supervisorId, "SUPERVISOR", AuditAction.FIELD_APPROVED,
                fieldName, null, null, null);
        return fv;
    }

    // ─── Flagga campo ─────────────────────────────────────────────────────────

    @Transactional
    public FieldValidation flagField(UUID tenantProfileId, String fieldName, String note, UUID supervisorId) {
        if (note == null || note.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Una nota è obbligatoria quando si segnala un errore");
        }
        FieldValidation fv = upsertValidation(tenantProfileId, fieldName, supervisorId,
                FieldValidationStatus.FLAGGED, note);
        AuditAction action = fieldName.startsWith("doc.")
                ? AuditAction.DOCUMENT_FLAGGED : AuditAction.FIELD_FLAGGED;
        audit(tenantProfileId, supervisorId, "SUPERVISOR", action, fieldName, null, null, note);
        return fv;
    }

    // ─── Completa validazione ─────────────────────────────────────────────────

    @Transactional
    public TenantProfile completeValidation(UUID tenantProfileId, UUID supervisorId) {
        TenantProfile profile = getProfile(tenantProfileId);

        List<FieldValidation> flagged = fieldValidationRepo
                .findByTenantProfileIdAndStatus(tenantProfileId, FieldValidationStatus.FLAGGED);

        if (flagged.isEmpty()) {
            // Nessun errore → profilo VERIFIED
            VerificationStatus prev = profile.getVerificationStatus();
            profile.setVerificationStatus(VerificationStatus.VERIFIED);
            profile.setLastValidatedBySupervisorId(supervisorId);
            profileRepo.save(profile);
            logStatusChange(tenantProfileId, supervisorId, "SUPERVISOR", prev, VerificationStatus.VERIFIED);
            notificationService.notifyUserProfileVerified(profile.getUser().getId());
            // Trigger matching: trova tutti gli annunci compatibili per questo tenant
            matchingService.computeMatchesForTenant(tenantProfileId);
        } else {
            // Ci sono errori → NEEDS_CORRECTION
            VerificationStatus prev = profile.getVerificationStatus();
            profile.setVerificationStatus(VerificationStatus.NEEDS_CORRECTION);
            profile.setLastValidatedBySupervisorId(supervisorId);
            profileRepo.save(profile);
            logStatusChange(tenantProfileId, supervisorId, "SUPERVISOR", prev, VerificationStatus.NEEDS_CORRECTION);
            notificationService.notifyUserCorrectionRequired(profile.getUser().getId());
        }
        return profile;
    }

    // ─── Chiamato da TenantController quando l'utente corregge un campo ──────

    @Transactional
    public void markFieldCorrected(UUID tenantProfileId, String fieldName, UUID userId) {
        fieldValidationRepo.findByTenantProfileIdAndFieldName(tenantProfileId, fieldName)
                .filter(fv -> fv.getStatus() == FieldValidationStatus.FLAGGED
                           && fv.getCorrectedAt() == null)
                .ifPresent(fv -> {
                    fv.setStatus(FieldValidationStatus.PENDING);
                    fv.setCorrectedAt(LocalDateTime.now());
                    fieldValidationRepo.save(fv);
                    audit(tenantProfileId, userId, "TENANT",
                            AuditAction.FIELD_CORRECTION_SUBMITTED, fieldName,
                            null, null, null);
                });

        // Controlla se tutti i campi flaggati sono stati corretti
        checkAndPromoteToValidation(tenantProfileId, userId);
    }

    // ─── Controlla se tutti FLAGGED sono corretti → PENDING_VALIDATION ────────

    @Transactional
    public void checkAndPromoteToValidation(UUID tenantProfileId, UUID userId) {
        TenantProfile profile = getProfile(tenantProfileId);
        if (profile.getVerificationStatus() != VerificationStatus.NEEDS_CORRECTION) return;

        boolean allCorrected = fieldValidationRepo
                .findByTenantProfileIdAndStatus(tenantProfileId, FieldValidationStatus.FLAGGED)
                .stream()
                .allMatch(fv -> fv.getCorrectedAt() != null);

        if (allCorrected) {
            profile.setVerificationStatus(VerificationStatus.PENDING_VALIDATION);
            profileRepo.save(profile);
            logStatusChange(tenantProfileId, userId, "TENANT",
                    VerificationStatus.NEEDS_CORRECTION, VerificationStatus.PENDING_VALIDATION);

            // Notifica il supervisor che aveva validato il profilo
            UUID supervisorId = profile.getLastValidatedBySupervisorId();
            if (supervisorId != null) {
                String tenantName = profile.getFullName() != null
                        ? profile.getFullName()
                        : profile.getUser().getEmail();
                notificationService.notifySupervisorProfileReady(supervisorId, tenantName);
            }
        }
    }

    // ─── Revoca approvazione campo ────────────────────────────────────────────

    @Transactional
    public void resetField(UUID tenantProfileId, String fieldName, UUID supervisorId) {
        fieldValidationRepo.findByTenantProfileIdAndFieldName(tenantProfileId, fieldName)
                .ifPresent(fv -> {
                    fv.setStatus(FieldValidationStatus.PENDING);
                    fv.setNote(null);
                    fv.setCorrectedAt(null);
                    fieldValidationRepo.save(fv);
                    audit(tenantProfileId, supervisorId, "SUPERVISOR",
                            AuditAction.FIELD_APPROVED, fieldName, "APPROVED", "PENDING", "Approvazione revocata");
                });
    }

    // ─── Leggi validazioni di un profilo ─────────────────────────────────────

    public List<FieldValidation> getFieldValidations(UUID tenantProfileId) {
        return fieldValidationRepo.findByTenantProfileId(tenantProfileId);
    }

    // ─── Controlla se un campo è approvato (per TenantController) ────────────

    public boolean isFieldApproved(UUID tenantProfileId, String fieldName) {
        return fieldValidationRepo.existsByTenantProfileIdAndFieldNameAndStatus(
                tenantProfileId, fieldName, FieldValidationStatus.APPROVED);
    }

    // ─── Chiamato quando il tenant modifica un campo sempre-editabile ─────────
    // (preferenze abitative, dati lavorativi, garante)
    // Resetta la validazione del campo e rimanda in coda il profilo.

    @Transactional
    public void markFieldChangedByTenant(UUID tenantProfileId, String fieldName, UUID userId) {
        // Resetta lo stato della validazione del campo se esiste
        fieldValidationRepo.findByTenantProfileIdAndFieldName(tenantProfileId, fieldName)
                .ifPresent(fv -> {
                    if (fv.getStatus() != FieldValidationStatus.PENDING) {
                        fv.setStatus(FieldValidationStatus.PENDING);
                        fv.setNote(null);
                        fv.setCorrectedAt(null);
                        fieldValidationRepo.save(fv);
                    }
                });

        // Se il profilo è in uno stato avanzato, rimandalo in PENDING_VALIDATION
        TenantProfile profile = getProfile(tenantProfileId);
        VerificationStatus current = profile.getVerificationStatus();
        if (current != VerificationStatus.NONE
                && current != VerificationStatus.PARTIAL
                && current != VerificationStatus.PENDING_VALIDATION) {
            profile.setVerificationStatus(VerificationStatus.PENDING_VALIDATION);
            profileRepo.save(profile);
            logStatusChange(tenantProfileId, userId, "TENANT", current, VerificationStatus.PENDING_VALIDATION);
        }

        audit(tenantProfileId, userId, "TENANT",
                AuditAction.FIELD_CORRECTION_SUBMITTED, fieldName, null, null, "Campo modificato dall'utente");
    }

    // ─── Helper privati ───────────────────────────────────────────────────────

    private TenantProfile getProfile(UUID id) {
        return profileRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
    }

    private FieldValidation upsertValidation(UUID profileId, String fieldName,
                                              UUID supervisorId,
                                              FieldValidationStatus status,
                                              String note) {
        FieldValidation fv = fieldValidationRepo
                .findByTenantProfileIdAndFieldName(profileId, fieldName)
                .orElseGet(() -> FieldValidation.builder()
                        .tenantProfileId(profileId)
                        .fieldName(fieldName)
                        .build());
        fv.setStatus(status);
        fv.setNote(note);
        fv.setSupervisorId(supervisorId);
        fv.setCorrectedAt(null); // reset correzione precedente
        return fieldValidationRepo.save(fv);
    }

    private void logStatusChange(UUID profileId, UUID actorId, String actorType,
                                  VerificationStatus from, VerificationStatus to) {
        audit(profileId, actorId, actorType, AuditAction.STATUS_CHANGED,
                null, from.name(), to.name(), null);
    }

    private void audit(UUID profileId, UUID actorId, String actorType,
                       AuditAction action, String fieldName,
                       String oldVal, String newVal, String note) {
        auditLogRepo.save(ProfileAuditLog.builder()
                .tenantProfileId(profileId)
                .actorId(actorId)
                .actorType(actorType)
                .action(action)
                .fieldName(fieldName)
                .oldValue(oldVal)
                .newValue(newVal)
                .note(note)
                .build());
    }
}
