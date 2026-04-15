package com.inquilino.controller;

import com.inquilino.dto.guarantor.GuarantorDto;
import com.inquilino.dto.guarantor.GuarantorRequest;
import com.inquilino.dto.supervisor.ScoreBreakdownDto;
import com.inquilino.dto.supervisor.SupervisorNoteDto;
import com.inquilino.dto.tenant.*;
import com.inquilino.entity.Document;
import com.inquilino.entity.ScoreOverride;
import com.inquilino.entity.TenantInterestArea;
import com.inquilino.entity.TenantProfile;
import com.inquilino.entity.User;
import com.inquilino.enums.ContractType;
import com.inquilino.enums.EmploymentType;
import com.inquilino.enums.VerificationStatus;
import com.inquilino.repository.*;
import com.inquilino.security.UserPrincipal;
import com.inquilino.security.UserService;
import com.inquilino.service.GuarantorService;
import com.inquilino.service.MatchingService;
import com.inquilino.service.ScoringService;
import com.inquilino.service.SupervisorNoteService;
import com.inquilino.service.SupervisorService;
import com.inquilino.service.TenantProfileService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tenant")
@RequiredArgsConstructor
public class TenantController {

    private final TenantProfileRepository   profileRepo;
    private final OnboardingStateRepository onboardingRepo;
    private final DocumentRepository        documentRepo;
    private final FieldValidationRepository fieldValidationRepo;
    private final InterestAreaRepository    interestAreaRepo;
    private final ScoringService            scoringService;
    private final UserService               userService;
    private final TenantProfileService      tenantProfileService;
    private final SupervisorService         supervisorService;
    private final MatchingService           matchingService;
    private final GuarantorService          guarantorService;
    private final SupervisorNoteService     supervisorNoteService;
    private final ScoreOverrideRepository   scoreOverrideRepo;
    private final S3Client                  s3Client;

    @Value("${minio.bucket}")
    private String bucket;

    // ─── GET /api/tenant/profile ──────────────────────────────────────────────────

    @GetMapping("/profile")
    public ResponseEntity<TenantProfileResponse> getProfile(
            @AuthenticationPrincipal UserPrincipal principal) {

        UUID userId = principal.getUserId();
        User user   = userService.findById(userId);

        boolean completed = onboardingRepo.findByUserId(userId)
                .map(s -> "STEP_18".equals(s.getCurrentStep()))
                .orElse(false);

        // Create profile from onboarding data if it doesn't exist yet
        TenantProfile            profile = tenantProfileService.getOrSync(userId);
        List<Document>           docs    = documentRepo.findByUserId(userId);
        List<TenantInterestArea> areas   = interestAreaRepo.findByUserId(userId);
        ScoreDto                 score   = scoringService.calculate(profile, docs);

        return ResponseEntity.ok(buildResponse(user, completed, profile, score, docs, areas));
    }

    // ─── GET /api/tenant/validations ─────────────────────────────────────────────

    @GetMapping("/validations")
    public ResponseEntity<List<com.inquilino.dto.supervisor.FieldValidationDto>> getMyValidations(
            @AuthenticationPrincipal UserPrincipal principal) {

        TenantProfile profile = profileRepo.findByUserId(principal.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        List<com.inquilino.dto.supervisor.FieldValidationDto> result =
                supervisorService.getFieldValidations(profile.getId())
                        .stream()
                        .map(com.inquilino.dto.supervisor.FieldValidationDto::from)
                        .toList();

        return ResponseEntity.ok(result);
    }

    // ─── PATCH /api/tenant/profile ────────────────────────────────────────────────

    @Transactional
    @PatchMapping("/profile")
    public ResponseEntity<TenantProfileResponse> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody TenantUpdateRequest req) {

        UUID          userId  = principal.getUserId();
        User          user    = userService.findById(userId);
        TenantProfile profile = profileRepo.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        UUID profileId = profile.getId();

        // Telefono (campo User)
        if (req.phone() != null && !req.phone().isBlank()) {
            user.setPhone(req.phone());
            userService.save(user);
            supervisorService.markFieldCorrected(profileId, "phone", userId);
        }

        // Preferenze abitative — sempre editabili, ma resettano la validazione del campo
        if (req.maxBudget()  != null) { profile.setMaxBudget(req.maxBudget());   supervisorService.markFieldChangedByTenant(profileId, "maxBudget", userId);  }
        if (req.moveInDate() != null) { profile.setMoveInDate(req.moveInDate());  supervisorService.markFieldChangedByTenant(profileId, "moveInDate", userId); }
        if (req.occupants()  != null) { profile.setOccupants(req.occupants());   supervisorService.markFieldChangedByTenant(profileId, "occupants", userId);  }
        if (req.hasPets()    != null) { profile.setHasPets(req.hasPets());       supervisorService.markFieldChangedByTenant(profileId, "hasPets", userId);    }
        if (req.smoker()     != null) { profile.setSmoker(req.smoker());         supervisorService.markFieldChangedByTenant(profileId, "smoker", userId);     }

        // Campi verificabili — editabili solo se non APPROVED dal supervisore
        if (req.fiscalCode() != null && !supervisorService.isFieldApproved(profileId, "fiscalCode")) {
            profile.setFiscalCode(req.fiscalCode());
            supervisorService.markFieldCorrected(profileId, "fiscalCode", userId);
        }
        if (req.fullName() != null && !supervisorService.isFieldApproved(profileId, "fullName")) {
            profile.setFullName(req.fullName());
            supervisorService.markFieldCorrected(profileId, "fullName", userId);
        }
        if (req.birthDate() != null && !supervisorService.isFieldApproved(profileId, "birthDate")) {
            profile.setBirthDate(req.birthDate());
            supervisorService.markFieldCorrected(profileId, "birthDate", userId);
        }
        if (req.birthPlace() != null && !supervisorService.isFieldApproved(profileId, "birthPlace")) {
            profile.setBirthPlace(req.birthPlace());
            supervisorService.markFieldCorrected(profileId, "birthPlace", userId);
        }
        if (req.residence() != null && !supervisorService.isFieldApproved(profileId, "residence")) {
            profile.setResidence(req.residence());
            supervisorService.markFieldCorrected(profileId, "residence", userId);
        }
        // Dati lavorativi — sempre editabili, resettano la validazione del campo
        if (req.contractType() != null) {
            profile.setContractType(ContractType.valueOf(req.contractType()));
            supervisorService.markFieldChangedByTenant(profileId, "contractType", userId);
        }
        if (req.employmentStartDate() != null) {
            profile.setEmploymentStartDate(req.employmentStartDate());
            supervisorService.markFieldChangedByTenant(profileId, "employmentStartDate", userId);
        }
        if (req.monthlyIncome() != null) {
            profile.setMonthlyIncome(req.monthlyIncome());
            supervisorService.markFieldChangedByTenant(profileId, "monthlyIncome", userId);
        }
        if (req.employmentType() != null) {
            try {
                profile.setEmploymentType(EmploymentType.valueOf(req.employmentType()));
                supervisorService.markFieldChangedByTenant(profileId, "employmentType", userId);
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid employment type: " + req.employmentType());
            }
        }
        // Garante — sempre editabile, resetta la validazione del campo
        if (req.hasGuarantor() != null) {
            profile.setHasGuarantor(req.hasGuarantor());
            supervisorService.markFieldChangedByTenant(profileId, "hasGuarantor", userId);
        }
        if (req.guarantorIncome() != null) {
            profile.setGuarantorIncome(req.guarantorIncome());
            supervisorService.markFieldChangedByTenant(profileId, "guarantorIncome", userId);
        }

        profileRepo.save(profile);

        boolean                  comp   = onboardingRepo.findByUserId(userId)
                .map(s -> "STEP_18".equals(s.getCurrentStep())).orElse(false);
        List<Document>           docs   = documentRepo.findByUserId(userId);
        List<TenantInterestArea> areas  = interestAreaRepo.findByUserId(userId);
        ScoreDto                 score  = scoringService.calculate(profile, docs);

        return ResponseEntity.ok(buildResponse(user, comp, profile, score, docs, areas));
    }


    // ─── PATCH /api/tenant/status ─────────────────────────────────────────────────

    @PatchMapping("/status")
    public ResponseEntity<Map<String, Boolean>> updateStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Boolean> body) {

        boolean active = Boolean.TRUE.equals(body.get("active"));

        TenantProfile profile = profileRepo.findByUserId(principal.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        profile.setActive(active);
        profileRepo.save(profile);

        if (active) {
            matchingService.computeMatchesForTenant(profile.getId());
        } else {
            matchingService.archiveMatchesForTenant(profile.getId());
        }

        return ResponseEntity.ok(Map.of("active", active));
    }

    // ─── DELETE /api/tenant/documents/{id} ───────────────────────────────────────

    @DeleteMapping("/documents/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {

        Document doc = documentRepo.findByIdAndUserId(id, principal.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if (doc.isVerified()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete a verified document");
        }
        TenantProfile tenantProfile = profileRepo.findByUserId(principal.getUserId()).orElse(null);
        if (tenantProfile != null) {
            String docField = "doc." + doc.getType().name();
            // Controlla se il tipo di documento è stato approvato dal supervisore
            if (supervisorService.isFieldApproved(tenantProfile.getId(), docField)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Cannot delete a supervisor-approved document type");
            }
            // Cascade: rimuove l'eventuale segnalazione/validazione supervisore sul tipo documento
            fieldValidationRepo.findByTenantProfileIdAndFieldName(tenantProfile.getId(), docField)
                    .ifPresent(fieldValidationRepo::delete);
        }
        documentRepo.delete(doc);
    }

    // ─── GET /api/tenant/documents/{id}/preview ───────────────────────────────────

    @GetMapping("/documents/{id}/preview")
    public ResponseEntity<byte[]> previewDocument(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {

        Document doc = documentRepo.findByIdAndUserId(id, principal.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        String key = extractMinioKey(doc.getFileUrl());

        try {
            ResponseBytes<GetObjectResponse> obj = s3Client.getObjectAsBytes(
                    GetObjectRequest.builder().bucket(bucket).key(key).build());

            String ct = obj.response().contentType();
            if (ct == null || ct.isBlank()) ct = "application/octet-stream";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(ct))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                    .body(obj.asByteArray());

        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not retrieve file");
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    private TenantProfileResponse buildResponse(
            User user,
            boolean completed,
            TenantProfile profile,
            ScoreDto score,
            List<Document> docs,
            List<TenantInterestArea> areas) {

        List<DocumentDto> docDtos = docs.stream()
                .map(d -> new DocumentDto(
                        d.getId(), d.getType().name(), d.getFileUrl(),
                        d.getUploadedAt(), d.isVerified(), d.getExtractedData()))
                .toList();

        List<InterestAreaDto> areaDtos = areas.stream()
                .map(a -> new InterestAreaDto(
                        a.getId(), a.getAreaType(), a.getCityName(), a.getAreaGeojson()))
                .toList();

        int completion = computeCompletion(profile, docs, areas);

        return new TenantProfileResponse(
                user.getEmail(),
                user.getPhone(),
                completed,
                profile.getId(),
                profile.getFullName(),
                profile.getBirthDate(),
                profile.getBirthPlace(),
                profile.getResidence(),
                profile.getFiscalCode(),
                profile.getEmploymentType() != null ? profile.getEmploymentType().name() : null,
                profile.getMonthlyIncome(),
                profile.getContractType() != null ? profile.getContractType().name() : null,
                profile.getEmploymentStartDate(),
                profile.isHasGuarantor(),
                profile.getGuarantorIncome(),
                profile.getMaxBudget(),
                profile.getMoveInDate(),
                profile.getOccupants(),
                profile.isHasPets(),
                profile.isSmoker(),
                profile.getDesiredLocations(),
                completion,
                profile.getVerificationStatus().name(),
                profile.isActive(),
                score,
                docDtos,
                areaDtos
        );
    }

    /** Dynamic completion: counts filled fields out of 12 key indicators. */
    private int computeCompletion(TenantProfile p, List<Document> docs, List<TenantInterestArea> areas) {
        if (p == null) return 0;
        int filled = 0;
        if (p.getFullName()           != null) filled++;
        if (p.getBirthDate()          != null) filled++;
        if (p.getBirthPlace()         != null) filled++;
        if (p.getResidence()          != null) filled++;
        if (p.getFiscalCode()         != null) filled++;
        if (p.getEmploymentType()     != null) filled++;
        if (p.getMonthlyIncome()      != null) filled++;
        if (p.getMaxBudget()          != null) filled++;
        if (p.getOccupants()          != null) filled++;
        if (p.getMoveInDate()         != null) filled++;
        if (docs  != null && !docs.isEmpty())  filled++;
        if (areas != null && !areas.isEmpty()) filled++;
        return filled * 100 / 12;
    }

    // ─── Garanti (tenant può aggiungere/modificare i propri garanti) ──────────

    @GetMapping("/guarantors")
    public List<GuarantorDto> listGuarantors(@AuthenticationPrincipal UserPrincipal principal) {
        TenantProfile p = requireProfile(principal.getUserId());
        return guarantorService.list(p.getId()).stream().map(GuarantorDto::from).toList();
    }

    @PostMapping("/guarantors")
    @ResponseStatus(HttpStatus.CREATED)
    public GuarantorDto addGuarantor(
            @RequestBody GuarantorRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        TenantProfile p = requireProfile(principal.getUserId());
        return GuarantorDto.from(
                guarantorService.create(p.getId(), req, principal.getUserId(), "TENANT"));
    }

    @PutMapping("/guarantors/{guarantorId}")
    public GuarantorDto updateGuarantor(
            @PathVariable UUID guarantorId,
            @RequestBody GuarantorRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        TenantProfile p = requireProfile(principal.getUserId());
        return GuarantorDto.from(guarantorService.update(guarantorId, p.getId(), req));
    }

    @DeleteMapping("/guarantors/{guarantorId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGuarantor(
            @PathVariable UUID guarantorId,
            @AuthenticationPrincipal UserPrincipal principal) {
        TenantProfile p = requireProfile(principal.getUserId());
        guarantorService.delete(guarantorId, p.getId());
    }

    // ─── Note del supervisore (azioni pending per il tenant) ─────────────────

    @GetMapping("/pending-actions")
    public List<SupervisorNoteDto> getPendingActions(@AuthenticationPrincipal UserPrincipal principal) {
        TenantProfile p = requireProfile(principal.getUserId());
        return supervisorNoteService.listPending(p.getId())
                .stream().map(SupervisorNoteDto::from).toList();
    }

    @PostMapping("/pending-actions/{noteId}/reply")
    public SupervisorNoteDto markReplied(
            @PathVariable UUID noteId,
            @AuthenticationPrincipal UserPrincipal principal) {
        TenantProfile p = requireProfile(principal.getUserId());
        return SupervisorNoteDto.from(supervisorNoteService.markReplied(noteId, p.getId()));
    }

    // ─── GET /api/tenant/score-breakdown ─────────────────────────────────────

    @GetMapping("/score-breakdown")
    public ScoreBreakdownDto getScoreBreakdown(
            @AuthenticationPrincipal UserPrincipal principal) {

        TenantProfile p = requireProfile(principal.getUserId());
        List<Document> docs = documentRepo.findByUserId(principal.getUserId());
        ScoreOverride override = scoreOverrideRepo.findByTenantProfileId(p.getId()).orElse(null);
        return scoringService.calculateBreakdown(p, docs, override);
    }

    private TenantProfile requireProfile(UUID userId) {
        return profileRepo.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
    }

    /** Extracts the MinIO object key from a full URL: http://host:port/bucket/key */
    private String extractMinioKey(String fileUrl) {
        String prefix = "/" + bucket + "/";
        int idx = fileUrl.indexOf(prefix);
        return idx >= 0 ? fileUrl.substring(idx + prefix.length()) : fileUrl;
    }
}
