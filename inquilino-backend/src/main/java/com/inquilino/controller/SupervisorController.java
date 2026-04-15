package com.inquilino.controller;

import com.inquilino.dto.guarantor.GuarantorDto;
import com.inquilino.dto.guarantor.GuarantorRequest;
import com.inquilino.dto.guarantor.GuarantorVerifyRequest;
import com.inquilino.dto.map.InterestAreaRequest;
import com.inquilino.dto.supervisor.ScoreBreakdownDto;
import com.inquilino.dto.supervisor.SupervisorNoteDto;
import com.inquilino.dto.supervisor.SupervisorNoteRequest;
import jakarta.transaction.Transactional;
import com.inquilino.dto.supervisor.FieldActionRequest;
import com.inquilino.dto.supervisor.FieldValidationDto;
import com.inquilino.dto.supervisor.ScoreDetailDto;
import com.inquilino.dto.supervisor.ScoreOverrideRequest;
import com.inquilino.dto.supervisor.SupervisorProfileDetailDto;
import com.inquilino.dto.supervisor.SupervisorProfileSummaryDto;
import com.inquilino.entity.*;
import com.inquilino.enums.StepStatus;
import com.inquilino.enums.VerificationStatus;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.StepRegistry;
import com.inquilino.repository.*;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.FiscalCodeAnalysisService;
import com.inquilino.service.GuarantorService;
import com.inquilino.service.ScoringService;
import com.inquilino.service.ScoringTemplateService;
import com.inquilino.service.SupervisorNoteService;
import com.inquilino.service.SupervisorService;
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

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/supervisor")
@RequiredArgsConstructor
public class SupervisorController {

    private final SupervisorService supervisorService;
    private final FiscalCodeAnalysisService fiscalCodeAnalysisService;
    private final ScoringService         scoringService;
    private final ScoringTemplateService scoringTemplateService;
    private final TenantProfileService   tenantProfileService;
    private final GuarantorService       guarantorService;
    private final SupervisorNoteService  supervisorNoteService;
    private final StepRegistry stepRegistry;
    private final TenantProfileRepository profileRepo;
    private final OnboardingStateRepository onboardingStateRepo;
    private final ScoreOverrideRepository scoreOverrideRepo;
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
        PageRequest pageable = PageRequest.of(page, size, Sort.by("id"));
        Page<TenantProfile> profiles = supervisorService.getProfilesByStatusesPaged(statusList, pageable);

        // Batch-fetch onboarding states for all profiles in this page
        List<UUID> userIds = profiles.getContent().stream()
                .map(p -> p.getUser().getId())
                .toList();
        Map<UUID, OnboardingState> stateByUserId = onboardingStateRepo.findByUserIdIn(userIds)
                .stream()
                .collect(Collectors.toMap(s -> s.getUser().getId(), s -> s));
        int totalSteps = stepRegistry.totalSteps();

        return profiles.map(p -> {
            OnboardingState state = stateByUserId.get(p.getUser().getId());
            int stepNumber;
            if (state == null) {
                // No onboarding state: assume complete if profile is past NONE, otherwise 0
                stepNumber = p.getVerificationStatus() == VerificationStatus.NONE ? 0 : totalSteps;
            } else {
                stepNumber = stepRegistry.get(state.getCurrentStep()).getStepNumber();
            }
            return SupervisorProfileSummaryDto.from(p, stepNumber, totalSteps);
        });
    }

    // ─── Dettaglio profilo (apre automaticamente IN_VALIDATION se PENDING) ────

    @GetMapping("/profiles/{profileId}")
    public SupervisorProfileDetailDto getProfile(
            @PathVariable UUID profileId,
            @AuthenticationPrincipal UserPrincipal principal) {

        TenantProfile p = supervisorService.openProfile(profileId, principal.getUserId());
        List<Document> docs = documentRepo.findByUserId(p.getUser().getId());
        ScoreOverride override = scoreOverrideRepo.findByTenantProfileId(profileId).orElse(null);
        ScoreDetailDto score = scoringService.calculateDetail(p, docs, override);
        return SupervisorProfileDetailDto.from(p, score);
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

    // ─── Score override ───────────────────────────────────────────────────────

    @Transactional
    @PutMapping("/profiles/{profileId}/score-override")
    public ScoreDetailDto setScoreOverride(
            @PathVariable UUID profileId,
            @RequestBody ScoreOverrideRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        TenantProfile p = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        ScoreOverride override = scoreOverrideRepo.findByTenantProfileId(profileId)
                .orElseGet(() -> ScoreOverride.builder().tenantProfileId(profileId).build());
        override.setSupervisorId(principal.getUserId());
        override.setRentSustainability(req.rentSustainability());
        override.setIncomeStability(req.incomeStability());
        override.setDocumentReliability(req.documentReliability());
        override.setReason(req.reason());
        scoreOverrideRepo.save(override);

        List<Document> docs = documentRepo.findByUserId(p.getUser().getId());
        return scoringService.calculateDetail(p, docs, override);
    }

    @Transactional
    @DeleteMapping("/profiles/{profileId}/score-override")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteScoreOverride(@PathVariable UUID profileId) {
        scoreOverrideRepo.deleteByTenantProfileId(profileId);
    }

    // ─── Scoring templates (read-only list for supervisor) ───────────────────

    @GetMapping("/scoring-templates")
    public List<com.inquilino.dto.admin.ScoringTemplateDto> listScoringTemplates() {
        return scoringTemplateService.listAll();
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

    /** Supervisor per-document check: sets extractedData.supervisor_verified. */
    @Transactional
    @PatchMapping("/profiles/{profileId}/documents/{docId}/supervisor-verify")
    public Map<String, Object> supervisorVerifyDocument(
            @PathVariable UUID profileId,
            @PathVariable UUID docId,
            @RequestBody Map<String, Object> body) {

        TenantProfile profile = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        Document doc = documentRepo.findByIdAndUserId(docId, profile.getUser().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        boolean checked = Boolean.TRUE.equals(body.get("checked"));
        Map<String, Object> extracted = new HashMap<>(
                doc.getExtractedData() != null ? doc.getExtractedData() : Map.of());
        extracted.put("supervisor_verified", checked);
        doc.setExtractedData(extracted);
        documentRepo.save(doc);

        return Map.of("id", doc.getId().toString(), "supervisorVerified", checked);
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

    // ─── Onboarding state (read) ──────────────────────────────────────────────

    @GetMapping("/profiles/{profileId}/onboarding-state")
    public Map<String, Object> getOnboardingState(@PathVariable UUID profileId) {
        TenantProfile profile = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        Optional<OnboardingState> stateOpt = onboardingStateRepo.findByUserId(profile.getUser().getId());
        Map<String, Object> result = new HashMap<>();
        int total = stepRegistry.totalSteps();

        if (stateOpt.isEmpty()) {
            result.put("currentStep", "STEP_03");
            result.put("stepNumber", 1);
            result.put("totalSteps", total);
            result.put("onboardingCompleted", false);
        } else {
            OnboardingState state = stateOpt.get();
            OnboardingStep step = stepRegistry.get(state.getCurrentStep());
            result.put("currentStep", state.getCurrentStep());
            result.put("stepNumber", step.getStepNumber());
            result.put("totalSteps", total);
            result.put("onboardingCompleted", "STEP_18".equals(state.getCurrentStep()));
        }
        return result;
    }

    // ─── Onboarding step advance (supervisor action) ──────────────────────────

    @Transactional
    @PostMapping("/profiles/{profileId}/advance-onboarding-step")
    public Map<String, Object> advanceOnboardingStep(@PathVariable UUID profileId) {
        TenantProfile profile = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));

        OnboardingState state = onboardingStateRepo.findByUserId(profile.getUser().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No onboarding state for this tenant"));

        String currentStepId = state.getCurrentStep();
        if ("STEP_18".equals(currentStepId)) {
            return Map.of("currentStep", "STEP_18", "stepNumber", stepRegistry.get("STEP_18").getStepNumber(),
                    "totalSteps", stepRegistry.totalSteps(), "onboardingCompleted", true);
        }

        OnboardingStep currentStep = stepRegistry.get(currentStepId);
        OnboardingContext ctx = new OnboardingContext(state, profile.getUser(), Locale.ITALIAN);
        String nextStepId = currentStep.resolveNextStep(ctx);

        // Safety fallback: if resolveNextStep loops back, use sequential next step
        if (nextStepId.equals(currentStepId)) {
            nextStepId = stepRegistry.getNext(currentStepId)
                    .map(OnboardingStep::getStepId)
                    .orElse(currentStepId);
        }

        // Mark current step as completed in the step manager
        if (state.getCompletedSteps() == null) state.setCompletedSteps(new ArrayList<>());
        if (!state.getCompletedSteps().contains(currentStepId)) {
            List<String> updated = new ArrayList<>(state.getCompletedSteps());
            updated.add(currentStepId);
            state.setCompletedSteps(updated);
        }
        state.setCurrentStep(nextStepId);
        state.setStepStatus(StepStatus.IN_PROGRESS);
        onboardingStateRepo.save(state);

        boolean completed = "STEP_18".equals(nextStepId);
        if (completed) {
            tenantProfileService.syncOnCompletion(profile.getUser().getId());
        }

        OnboardingStep nextStep = stepRegistry.get(nextStepId);
        Map<String, Object> result = new HashMap<>();
        result.put("currentStep", nextStepId);
        result.put("stepNumber", nextStep.getStepNumber());
        result.put("totalSteps", stepRegistry.totalSteps());
        result.put("onboardingCompleted", completed);
        return result;
    }

    // ─── Scoring template ─────────────────────────────────────────────────────

    /**
     * Assegna un template di scoring al profilo. Passa templateId=null per tornare
     * ai pesi di default. Se il profilo è già VERIFIED, i match vengono ricalcolati subito.
     */
    @PutMapping("/profiles/{profileId}/scoring-template")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void assignScoringTemplate(
            @PathVariable UUID profileId,
            @RequestBody Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal principal) {

        Object raw = body.get("templateId");
        UUID templateId = raw != null ? UUID.fromString(raw.toString()) : null;
        scoringTemplateService.assignToProfile(profileId, templateId, principal.getUserId());
    }

    // ─── Score breakdown completo ─────────────────────────────────────────────

    @GetMapping("/profiles/{profileId}/score-breakdown")
    public ScoreBreakdownDto getScoreBreakdown(
            @PathVariable UUID profileId) {

        TenantProfile p = profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        List<Document> docs = documentRepo.findByUserId(p.getUser().getId());
        ScoreOverride override = scoreOverrideRepo.findByTenantProfileId(profileId).orElse(null);
        return scoringService.calculateBreakdown(p, docs, override);
    }

    // ─── Verified value su campo (es. monthlyIncome) ──────────────────────────

    @Transactional
    @PatchMapping("/profiles/{profileId}/fields/{fieldName}/verified-value")
    public FieldValidationDto setVerifiedValue(
            @PathVariable UUID profileId,
            @PathVariable String fieldName,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {

        String verifiedValue = body.get("verifiedValue");
        FieldValidation fv = supervisorService.approveField(profileId, fieldName, principal.getUserId());
        fv.setVerifiedValue(verifiedValue);
        // Salviamo tramite il supervisor service riutilizzando il campo nota come workaround
        // Il FieldValidationRepository è accessibile via supervisorService internamente
        // Usiamo accesso diretto tramite approveField che ritorna l'entità salvata
        // e poi ri-salviamo via il fieldValidationRepo iniettato nel supervisor controller
        // (necessita di injection diretta)
        return FieldValidationDto.from(fv);
    }

    // ─── Garanti ─────────────────────────────────────────────────────────────

    @GetMapping("/profiles/{profileId}/guarantors")
    public List<GuarantorDto> listGuarantors(@PathVariable UUID profileId) {
        return guarantorService.list(profileId)
                .stream().map(GuarantorDto::from).toList();
    }

    @PostMapping("/profiles/{profileId}/guarantors")
    @ResponseStatus(HttpStatus.CREATED)
    public GuarantorDto addGuarantor(
            @PathVariable UUID profileId,
            @RequestBody GuarantorRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        return GuarantorDto.from(
                guarantorService.create(profileId, req, principal.getUserId(), "SUPERVISOR"));
    }

    @PutMapping("/profiles/{profileId}/guarantors/{guarantorId}")
    public GuarantorDto updateGuarantor(
            @PathVariable UUID profileId,
            @PathVariable UUID guarantorId,
            @RequestBody GuarantorRequest req) {
        return GuarantorDto.from(guarantorService.update(guarantorId, profileId, req));
    }

    @PutMapping("/profiles/{profileId}/guarantors/{guarantorId}/verify-income")
    public GuarantorDto verifyGuarantorIncome(
            @PathVariable UUID profileId,
            @PathVariable UUID guarantorId,
            @RequestBody GuarantorVerifyRequest req) {
        return GuarantorDto.from(
                guarantorService.verifyIncome(guarantorId, profileId, req.verifiedMonthlyIncome()));
    }

    @DeleteMapping("/profiles/{profileId}/guarantors/{guarantorId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGuarantor(
            @PathVariable UUID profileId,
            @PathVariable UUID guarantorId) {
        guarantorService.delete(guarantorId, profileId);
    }

    // ─── Note al tenant ───────────────────────────────────────────────────────

    @GetMapping("/profiles/{profileId}/notes")
    public List<SupervisorNoteDto> listNotes(@PathVariable UUID profileId) {
        return supervisorNoteService.listNotes(profileId)
                .stream().map(SupervisorNoteDto::from).toList();
    }

    @PostMapping("/profiles/{profileId}/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public SupervisorNoteDto sendNote(
            @PathVariable UUID profileId,
            @RequestBody SupervisorNoteRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        profileRepo.findById(profileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not found"));
        return SupervisorNoteDto.from(
                supervisorNoteService.send(profileId, principal.getUserId(), req));
    }

    @PutMapping("/profiles/{profileId}/notes/{noteId}/resolve")
    public SupervisorNoteDto resolveNote(
            @PathVariable UUID profileId,
            @PathVariable UUID noteId) {
        return SupervisorNoteDto.from(supervisorNoteService.resolve(noteId, profileId));
    }

    @DeleteMapping("/profiles/{profileId}/notes/{noteId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteNote(@PathVariable UUID noteId) {
        supervisorNoteService.delete(noteId);
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private String extractMinioKey(String fileUrl) {
        String prefix = "/" + bucket + "/";
        int idx = fileUrl.indexOf(prefix);
        return idx >= 0 ? fileUrl.substring(idx + prefix.length()) : fileUrl;
    }
}
