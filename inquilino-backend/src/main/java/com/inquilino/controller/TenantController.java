package com.inquilino.controller;

import com.inquilino.dto.tenant.*;
import com.inquilino.entity.Document;
import com.inquilino.entity.TenantInterestArea;
import com.inquilino.entity.TenantProfile;
import com.inquilino.entity.User;
import com.inquilino.enums.EmploymentType;
import com.inquilino.enums.VerificationStatus;
import com.inquilino.repository.*;
import com.inquilino.security.UserPrincipal;
import com.inquilino.security.UserService;
import com.inquilino.service.ScoringService;
import com.inquilino.service.TenantProfileService;
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
    private final InterestAreaRepository    interestAreaRepo;
    private final ScoringService            scoringService;
    private final UserService               userService;
    private final TenantProfileService      tenantProfileService;
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

    // ─── PATCH /api/tenant/profile ────────────────────────────────────────────────

    @PatchMapping("/profile")
    public ResponseEntity<TenantProfileResponse> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody TenantUpdateRequest req) {

        UUID          userId  = principal.getUserId();
        TenantProfile profile = profileRepo.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        boolean locked = profile.getVerificationStatus() == VerificationStatus.VERIFIED;

        // Always editable
        if (req.maxBudget()  != null) profile.setMaxBudget(req.maxBudget());
        if (req.moveInDate() != null) profile.setMoveInDate(req.moveInDate());
        if (req.occupants()  != null) profile.setOccupants(req.occupants());
        if (req.hasPets()    != null) profile.setHasPets(req.hasPets());
        if (req.smoker()     != null) profile.setSmoker(req.smoker());

        // Editable only when not VERIFIED
        if (!locked) {
            if (req.fullName()            != null) profile.setFullName(req.fullName());
            if (req.birthDate()           != null) profile.setBirthDate(req.birthDate());
            if (req.birthPlace()          != null) profile.setBirthPlace(req.birthPlace());
            if (req.residence()           != null) profile.setResidence(req.residence());
            if (req.contractType()        != null) profile.setContractType(req.contractType());
            if (req.employmentStartDate() != null) profile.setEmploymentStartDate(req.employmentStartDate());
            if (req.hasGuarantor()        != null) profile.setHasGuarantor(req.hasGuarantor());
            if (req.guarantorIncome()     != null) profile.setGuarantorIncome(req.guarantorIncome());
            if (req.monthlyIncome()       != null) profile.setMonthlyIncome(req.monthlyIncome());
            if (req.employmentType() != null) {
                try {
                    profile.setEmploymentType(EmploymentType.valueOf(req.employmentType()));
                } catch (IllegalArgumentException ex) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Invalid employment type: " + req.employmentType());
                }
            }
        }

        profileRepo.save(profile);

        User                     user   = userService.findById(userId);
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
                profile.getContractType(),
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

    /** Extracts the MinIO object key from a full URL: http://host:port/bucket/key */
    private String extractMinioKey(String fileUrl) {
        String prefix = "/" + bucket + "/";
        int idx = fileUrl.indexOf(prefix);
        return idx >= 0 ? fileUrl.substring(idx + prefix.length()) : fileUrl;
    }
}
