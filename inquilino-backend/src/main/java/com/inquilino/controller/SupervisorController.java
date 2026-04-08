package com.inquilino.controller;

import com.inquilino.dto.map.InterestAreaRequest;
import jakarta.transaction.Transactional;
import com.inquilino.dto.supervisor.FieldActionRequest;
import com.inquilino.dto.supervisor.FieldValidationDto;
import com.inquilino.dto.supervisor.SupervisorProfileDetailDto;
import com.inquilino.dto.supervisor.SupervisorProfileSummaryDto;
import com.inquilino.entity.*;
import com.inquilino.enums.VerificationStatus;
import com.inquilino.repository.*;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.FiscalCodeAnalysisService;
import com.inquilino.service.SupervisorService;
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

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/supervisor")
@RequiredArgsConstructor
public class SupervisorController {

    private final SupervisorService supervisorService;
    private final FiscalCodeAnalysisService fiscalCodeAnalysisService;
    private final TenantProfileRepository profileRepo;
    private final DocumentRepository documentRepo;
    private final ChatMessageRepository chatMessageRepo;
    private final InterestAreaRepository interestAreaRepo;
    private final S3Client s3Client;

    @Value("${minio.bucket}")
    private String bucket;

    // ─── Lista profili per status ─────────────────────────────────────────────

    @GetMapping("/profiles")
    public Page<SupervisorProfileSummaryDto> listProfiles(
            @RequestParam(defaultValue = "PENDING_VALIDATION,IN_VALIDATION,NEEDS_CORRECTION")
            String statuses,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        List<VerificationStatus> statusList = List.of(statuses.split(","))
                .stream()
                .map(s -> VerificationStatus.valueOf(s.trim()))
                .toList();
        PageRequest pageable = PageRequest.of(page, size);
        return supervisorService.getProfilesByStatusesPaged(statusList, pageable)
                .map(SupervisorProfileSummaryDto::from);
    }

    // ─── Dettaglio profilo (apre automaticamente IN_VALIDATION se PENDING) ────

    @GetMapping("/profiles/{profileId}")
    public SupervisorProfileDetailDto getProfile(
            @PathVariable UUID profileId,
            @AuthenticationPrincipal UserPrincipal principal) {

        TenantProfile p = supervisorService.openProfile(profileId, principal.getUserId());
        return SupervisorProfileDetailDto.from(p);
    }

    // ─── Field validations di un profilo ─────────────────────────────────────

    @GetMapping("/profiles/{profileId}/validations")
    public List<FieldValidationDto> getValidations(@PathVariable UUID profileId) {
        return supervisorService.getFieldValidations(profileId)
                .stream()
                .map(FieldValidationDto::from)
                .toList();
    }

    // ─── Approva campo ────────────────────────────────────────────────────────

    @PostMapping("/profiles/{profileId}/fields/{fieldName}/approve")
    public FieldValidationDto approveField(
            @PathVariable UUID profileId,
            @PathVariable String fieldName,
            @AuthenticationPrincipal UserPrincipal principal) {

        return FieldValidationDto.from(
                supervisorService.approveField(profileId, fieldName, principal.getUserId()));
    }

    // ─── Flagga campo ─────────────────────────────────────────────────────────

    @PostMapping("/profiles/{profileId}/fields/{fieldName}/flag")
    public FieldValidationDto flagField(
            @PathVariable UUID profileId,
            @PathVariable String fieldName,
            @RequestBody FieldActionRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        return FieldValidationDto.from(
                supervisorService.flagField(profileId, fieldName, req.note(), principal.getUserId()));
    }

    // ─── Revoca approvazione campo ────────────────────────────────────────────

    @DeleteMapping("/profiles/{profileId}/fields/{fieldName}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetField(
            @PathVariable UUID profileId,
            @PathVariable String fieldName,
            @AuthenticationPrincipal UserPrincipal principal) {
        supervisorService.resetField(profileId, fieldName, principal.getUserId());
    }

    // ─── Analisi codice fiscale ───────────────────────────────────────────────

    @GetMapping("/profiles/{profileId}/tools/fiscal-code")
    public FiscalCodeAnalysisService.FiscalCodeAnalysis analyseFiscalCode(
            @PathVariable UUID profileId) {
        TenantProfile p = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        FiscalCodeAnalysisService.FiscalCodeAnalysis result = fiscalCodeAnalysisService.analyse(p);
        if (result == null) throw new ResponseStatusException(HttpStatus.NO_CONTENT, "No fiscal code");
        return result;
    }

    // ─── Completa validazione ─────────────────────────────────────────────────

    @PostMapping("/profiles/{profileId}/complete-validation")
    public Map<String, String> completeValidation(
            @PathVariable UUID profileId,
            @AuthenticationPrincipal UserPrincipal principal) {

        TenantProfile result = supervisorService.completeValidation(profileId, principal.getUserId());
        return Map.of("verificationStatus", result.getVerificationStatus().name());
    }

    // ─── Chat history ─────────────────────────────────────────────────────────

    @GetMapping("/profiles/{profileId}/chat")
    public List<Map<String, Object>> getChatHistory(@PathVariable UUID profileId) {
        TenantProfile profile = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        return chatMessageRepo.findByUserIdOrderByCreatedAtAsc(profile.getUser().getId())
                .stream()
                .map(m -> Map.<String, Object>of(
                        "id",        m.getId(),
                        "role",      m.getRole().name(),
                        "content",   m.getContent(),
                        "step",      m.getStep() != null ? m.getStep() : "",
                        "createdAt", m.getCreatedAt().toString()
                ))
                .toList();
    }

    // ─── Documenti ────────────────────────────────────────────────────────────

    @GetMapping("/profiles/{profileId}/documents")
    public List<Map<String, Object>> getDocuments(@PathVariable UUID profileId) {
        TenantProfile profile = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        return documentRepo.findByUserId(profile.getUser().getId())
                .stream()
                .map(d -> Map.<String, Object>of(
                        "id",            d.getId(),
                        "type",          d.getType().name(),
                        "uploadedAt",    d.getUploadedAt().toString(),
                        "verified",      d.isVerified(),
                        "extractedData", d.getExtractedData() != null ? d.getExtractedData() : Map.of()
                ))
                .toList();
    }

    @GetMapping("/profiles/{profileId}/documents/{docId}/preview")
    public ResponseEntity<byte[]> previewDocument(
            @PathVariable UUID profileId,
            @PathVariable UUID docId) {

        TenantProfile profile = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        Document doc = documentRepo.findByIdAndUserId(docId, profile.getUser().getId())
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

    // ─── Interest areas ───────────────────────────────────────────────────────

    @GetMapping("/profiles/{profileId}/interest-areas")
    public List<TenantInterestArea> getInterestAreas(@PathVariable UUID profileId) {
        TenantProfile profile = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        return interestAreaRepo.findByUserId(profile.getUser().getId());
    }

    @Transactional
    @PutMapping("/profiles/{profileId}/interest-areas")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateInterestAreas(
            @PathVariable UUID profileId,
            @RequestBody List<InterestAreaRequest> areas,
            @AuthenticationPrincipal UserPrincipal principal) {

        TenantProfile profile = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        interestAreaRepo.deleteByUserId(profile.getUser().getId());
        for (InterestAreaRequest req : areas) {
            interestAreaRepo.save(TenantInterestArea.builder()
                    .userId(profile.getUser().getId())
                    .areaType(req.areaType())
                    .cityName(req.cityName())
                    .areaGeojson(req.areaGeojson())
                    .build());
        }
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private String extractMinioKey(String fileUrl) {
        String prefix = "/" + bucket + "/";
        int idx = fileUrl.indexOf(prefix);
        return idx >= 0 ? fileUrl.substring(idx + prefix.length()) : fileUrl;
    }
}
