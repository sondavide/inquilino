package com.inquilino.service;

import com.inquilino.entity.*;
import com.inquilino.enums.*;
import com.inquilino.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListingValidationService {

    private final ListingRepository              listingRepo;
    private final ListingFieldValidationRepository fieldValidationRepo;
    private final ListingAuditLogRepository      auditLogRepo;
    private final NotificationService            notificationService;
    private final MatchingService                matchingService;

    // ─── Apre l'annuncio per validazione ─────────────────────────────────────

    @Transactional
    public Listing openListing(UUID listingId, UUID supervisorId) {
        Listing listing = getListing(listingId);
        if (listing.getStatus() == ListingStatus.IN_REVIEW) {
            listing.setAssignedSupervisorId(supervisorId);
            listingRepo.save(listing);
            audit(listingId, supervisorId, "SUPERVISOR", ListingAuditAction.STATUS_CHANGED,
                    null, ListingStatus.IN_REVIEW.name(), ListingStatus.IN_REVIEW.name(), "Aperto per revisione");
        }
        return listing;
    }

    // ─── Approva campo ────────────────────────────────────────────────────────

    @Transactional
    public ListingFieldValidation approveField(UUID listingId, String fieldName, UUID supervisorId) {
        ListingFieldValidation fv = upsertValidation(listingId, fieldName, supervisorId,
                FieldValidationStatus.APPROVED, null);
        audit(listingId, supervisorId, "SUPERVISOR", ListingAuditAction.FIELD_APPROVED,
                fieldName, null, null, null);
        return fv;
    }

    // ─── Flagga campo ─────────────────────────────────────────────────────────

    @Transactional
    public ListingFieldValidation flagField(UUID listingId, String fieldName,
                                            String note, UUID supervisorId) {
        if (note == null || note.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Una nota è obbligatoria quando si segnala un errore");
        }
        ListingFieldValidation fv = upsertValidation(listingId, fieldName, supervisorId,
                FieldValidationStatus.FLAGGED, note);
        audit(listingId, supervisorId, "SUPERVISOR", ListingAuditAction.FIELD_FLAGGED,
                fieldName, null, null, note);
        return fv;
    }

    // ─── Revoca approvazione ──────────────────────────────────────────────────

    @Transactional
    public void resetField(UUID listingId, String fieldName, UUID supervisorId) {
        fieldValidationRepo.findByListingIdAndFieldName(listingId, fieldName)
                .ifPresent(fv -> {
                    fv.setStatus(FieldValidationStatus.PENDING);
                    fv.setNote(null);
                    fv.setCorrectedAt(null);
                    fieldValidationRepo.save(fv);
                    audit(listingId, supervisorId, "SUPERVISOR",
                            ListingAuditAction.FIELD_APPROVED, fieldName, "APPROVED", "PENDING",
                            "Approvazione revocata");
                });
    }

    // ─── Completa validazione ─────────────────────────────────────────────────

    @Transactional
    public Listing completeValidation(UUID listingId, UUID supervisorId) {
        Listing listing = getListing(listingId);

        List<ListingFieldValidation> flagged = fieldValidationRepo
                .findByListingIdAndStatus(listingId, FieldValidationStatus.FLAGGED);

        if (flagged.isEmpty()) {
            // Nessun errore → PUBLISHED
            listing.setStatus(ListingStatus.PUBLISHED);
            listing.setPublishedAt(LocalDateTime.now());
            listing.setLastValidatedBySupervisorId(supervisorId);
            listingRepo.save(listing);
            audit(listingId, supervisorId, "SUPERVISOR", ListingAuditAction.PUBLISHED,
                    null, ListingStatus.IN_REVIEW.name(), ListingStatus.PUBLISHED.name(), null);
            notificationService.notifyListingPublished(listing.getPublisherUserId());
            // Trigger matching: trova tutti i tenant compatibili
            matchingService.computeMatchesForListing(listingId);
        } else {
            // Ci sono errori → REJECTED (landlord deve correggere e reinviare)
            listing.setStatus(ListingStatus.REJECTED);
            listing.setLastValidatedBySupervisorId(supervisorId);
            listingRepo.save(listing);
            audit(listingId, supervisorId, "SUPERVISOR", ListingAuditAction.REJECTED,
                    null, ListingStatus.IN_REVIEW.name(), ListingStatus.REJECTED.name(), null);
            notificationService.notifyListingRejected(listing.getPublisherUserId());
        }
        return listing;
    }

    // ─── Marking correzione landlord ──────────────────────────────────────────

    @Transactional
    public void markFieldCorrected(UUID listingId, String fieldName, UUID userId) {
        fieldValidationRepo.findByListingIdAndFieldName(listingId, fieldName)
                .filter(fv -> fv.getStatus() == FieldValidationStatus.FLAGGED
                           && fv.getCorrectedAt() == null)
                .ifPresent(fv -> {
                    fv.setStatus(FieldValidationStatus.PENDING);
                    fv.setCorrectedAt(LocalDateTime.now());
                    fieldValidationRepo.save(fv);
                    audit(listingId, userId, "LANDLORD",
                            ListingAuditAction.FIELD_CORRECTION_SUBMITTED, fieldName,
                            null, null, null);
                });
    }

    // ─── Leggi validazioni ────────────────────────────────────────────────────

    public List<ListingFieldValidation> getFieldValidations(UUID listingId) {
        return fieldValidationRepo.findByListingId(listingId);
    }

    public boolean isFieldApproved(UUID listingId, String fieldName) {
        return fieldValidationRepo.existsByListingIdAndFieldNameAndStatus(
                listingId, fieldName, FieldValidationStatus.APPROVED);
    }

    // ─── Helper privati ───────────────────────────────────────────────────────

    private Listing getListing(UUID id) {
        return listingRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));
    }

    private ListingFieldValidation upsertValidation(UUID listingId, String fieldName,
                                                     UUID supervisorId,
                                                     FieldValidationStatus status,
                                                     String note) {
        ListingFieldValidation fv = fieldValidationRepo
                .findByListingIdAndFieldName(listingId, fieldName)
                .orElseGet(() -> ListingFieldValidation.builder()
                        .listingId(listingId).fieldName(fieldName).build());
        fv.setStatus(status);
        fv.setNote(note);
        fv.setSupervisorId(supervisorId);
        fv.setCorrectedAt(null);
        return fieldValidationRepo.save(fv);
    }

    private void audit(UUID listingId, UUID actorId, String actorType,
                       ListingAuditAction action, String field,
                       String oldVal, String newVal, String note) {
        auditLogRepo.save(ListingAuditLog.builder()
                .listingId(listingId).actorId(actorId).actorType(actorType)
                .action(action).fieldName(field)
                .oldValue(oldVal).newValue(newVal).note(note)
                .build());
    }
}
