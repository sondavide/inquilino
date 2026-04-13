package com.inquilino.controller;

import com.inquilino.dto.admin.CreateSupervisorRequest;
import com.inquilino.dto.admin.OnboardingAnalyticsResponse;
import com.inquilino.dto.admin.ScoringTemplateDto;
import com.inquilino.dto.admin.ScoringTemplateRequest;
import com.inquilino.dto.admin.StepConfigDto;
import com.inquilino.entity.ProfileAuditLog;
import com.inquilino.entity.User;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.OnboardingPromptService;
import com.inquilino.service.ScoringTemplateService;
import com.inquilino.service.SuperAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class SuperAdminController {

    private final SuperAdminService       superAdminService;
    private final OnboardingPromptService onboardingPromptService;
    private final ScoringTemplateService  scoringTemplateService;

    // ─── Supervisori ──────────────────────────────────────────────────────────

    @PostMapping("/supervisors")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createSupervisor(
            @RequestBody @Valid CreateSupervisorRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        User supervisor = superAdminService.createSupervisor(
                req.email(), req.password(), req.phone(), principal.getUserId());

        return Map.of(
                "id",    supervisor.getId(),
                "email", supervisor.getEmail(),
                "phone", supervisor.getPhone() != null ? supervisor.getPhone() : ""
        );
    }

    @GetMapping("/supervisors")
    public List<Map<String, Object>> listSupervisors() {
        return superAdminService.listSupervisors().stream()
                .map(u -> Map.<String, Object>of(
                        "id",    u.getId(),
                        "email", u.getEmail(),
                        "phone", u.getPhone() != null ? u.getPhone() : ""
                ))
                .toList();
    }

    // ─── Onboarding prompt configs ────────────────────────────────────────────

    /** Lists prompt config for all steps (null overrides = code defaults are active). */
    @GetMapping("/onboarding/configs")
    public List<StepConfigDto> listOnboardingConfigs() {
        return onboardingPromptService.listConfigs();
    }

    /** Returns the config for a single step. */
    @GetMapping("/onboarding/configs/{stepId}")
    public StepConfigDto getOnboardingConfig(@PathVariable String stepId) {
        return onboardingPromptService.getConfig(stepId);
    }

    /**
     * Saves (upserts) prompt overrides for a step. Takes effect within ~30 s — no restart needed.
     * Pass null or empty string for a field to revert it to the code default.
     */
    @PutMapping("/onboarding/configs/{stepId}")
    public StepConfigDto saveOnboardingConfig(
            @PathVariable String stepId,
            @RequestBody StepConfigDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {

        return onboardingPromptService.saveConfig(stepId, dto, principal.getEmail());
    }

    /**
     * Deletes the override for a step, fully reverting to the hardcoded Java default.
     */
    @DeleteMapping("/onboarding/configs/{stepId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOnboardingConfig(@PathVariable String stepId) {
        onboardingPromptService.deleteConfig(stepId);
    }

    // ─── Onboarding analytics ─────────────────────────────────────────────────

    /**
     * Returns per-step completion/stuck rates and per-field population rates.
     * Computes live from onboarding_states — intended for low-frequency admin access.
     */
    @GetMapping("/onboarding/analytics")
    public OnboardingAnalyticsResponse getOnboardingAnalytics() {
        return onboardingPromptService.computeAnalytics();
    }

    // ─── Scoring templates ────────────────────────────────────────────────────

    @GetMapping("/scoring-templates")
    public List<ScoringTemplateDto> listScoringTemplates() {
        return scoringTemplateService.listAll();
    }

    @GetMapping("/scoring-templates/{id}")
    public ScoringTemplateDto getScoringTemplate(@PathVariable UUID id) {
        return scoringTemplateService.getById(id);
    }

    @PostMapping("/scoring-templates")
    @ResponseStatus(HttpStatus.CREATED)
    public ScoringTemplateDto createScoringTemplate(
            @RequestBody @Valid ScoringTemplateRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return scoringTemplateService.create(req, principal.getUserId());
    }

    /**
     * Aggiorna i pesi del template e avvia il ricalcolo in background
     * per tutti i profili VERIFIED collegati. Al termine arriva una notifica.
     */
    @PutMapping("/scoring-templates/{id}")
    public ScoringTemplateDto updateScoringTemplate(
            @PathVariable UUID id,
            @RequestBody @Valid ScoringTemplateRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return scoringTemplateService.update(id, req, principal.getUserId());
    }

    @DeleteMapping("/scoring-templates/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteScoringTemplate(@PathVariable UUID id) {
        scoringTemplateService.delete(id);
    }

    // ─── Audit log ────────────────────────────────────────────────────────────

    @GetMapping("/audit-log")
    public Page<ProfileAuditLog> getAuditLog(
            @RequestParam(required = false) UUID profileId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {

        return superAdminService.getAuditLog(profileId, q, pageable);
    }
}
