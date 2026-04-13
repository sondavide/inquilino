package com.inquilino.service;

import com.inquilino.dto.admin.OnboardingAnalyticsResponse;
import com.inquilino.dto.admin.StepConfigDto;
import com.inquilino.entity.OnboardingState;
import com.inquilino.entity.OnboardingStepConfig;
import com.inquilino.onboarding.ChecklistItem;
import com.inquilino.onboarding.OnboardingContext;
import com.inquilino.onboarding.OnboardingStep;
import com.inquilino.onboarding.StepRegistry;
import com.inquilino.repository.OnboardingStepConfigRepository;
import com.inquilino.repository.OnboardingStateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages runtime-editable LLM prompt overrides for onboarding steps.
 *
 * <p>Prompts are stored in {@code onboarding_step_configs} and cached in memory
 * for up to {@value #TTL_SECONDS} seconds. An update call immediately invalidates
 * the cache entry so the new prompt takes effect on the next request (~instant).
 *
 * <p>Template variables recognised inside stored prompts:
 * <ul>
 *   <li>{@code {{collected_data}}} — replaced with ctx.formattedData()</li>
 *   <li>{@code {{lang}}} — replaced with ctx.lang() ("Italian" / "English")</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OnboardingPromptService {

    private static final int TTL_SECONDS = 30;

    private final OnboardingStepConfigRepository configRepo;
    private final OnboardingStateRepository      stateRepo;
    private final StepRegistry                   stepRegistry;

    // ─── Cache ────────────────────────────────────────────────────────────────

    private record CachedEntry(Optional<OnboardingStepConfig> value, long loadedAt) {
        boolean isExpired() {
            return (System.currentTimeMillis() - loadedAt) > TTL_SECONDS * 1_000L;
        }
    }

    private final ConcurrentHashMap<String, CachedEntry> cache = new ConcurrentHashMap<>();

    private Optional<OnboardingStepConfig> load(String stepId) {
        CachedEntry entry = cache.get(stepId);
        if (entry == null || entry.isExpired()) {
            Optional<OnboardingStepConfig> fresh = configRepo.findById(stepId);
            cache.put(stepId, new CachedEntry(fresh, System.currentTimeMillis()));
            return fresh;
        }
        return entry.value();
    }

    /** Evicts the cache entry for the given step (called after an update). */
    private void evict(String stepId) {
        cache.remove(stepId);
    }

    // ─── Prompt resolution ────────────────────────────────────────────────────

    /**
     * Returns the resolved system prompt for the given step, if an override is configured.
     * Template variables are substituted using the provided context.
     * Returns {@link Optional#empty()} when no override exists (caller falls back to step default).
     */
    public Optional<String> resolveSystemPrompt(String stepId, OnboardingContext ctx) {
        return load(stepId)
                .map(OnboardingStepConfig::getSystemPromptOverride)
                .filter(p -> p != null && !p.isBlank())
                .map(template -> substitute(template, ctx));
    }

    /**
     * Returns the resolved extraction prompt for the given step, if an override is configured.
     * Returns {@link Optional#empty()} when no override exists.
     */
    public Optional<String> resolveExtractionPrompt(String stepId, OnboardingContext ctx) {
        return load(stepId)
                .map(OnboardingStepConfig::getExtractionPromptOverride)
                .filter(p -> p != null && !p.isBlank())
                .map(template -> substitute(template, ctx));
    }

    private static String substitute(String template, OnboardingContext ctx) {
        return template
                .replace("{{collected_data}}", ctx.formattedData())
                .replace("{{lang}}", ctx.lang());
    }

    // ─── Admin CRUD ───────────────────────────────────────────────────────────

    /** Lists the current DB config for all known steps (null overrides = defaults active). */
    public List<StepConfigDto> listConfigs() {
        Map<String, OnboardingStepConfig> existing = new HashMap<>();
        configRepo.findAll().forEach(c -> existing.put(c.getStepId(), c));

        return stepRegistry.getAll().stream()
                .map(step -> {
                    OnboardingStepConfig cfg = existing.get(step.getStepId());
                    return toDto(step, cfg);
                })
                .toList();
    }

    /** Returns the config for a single step (or a blank DTO if no override exists). */
    public StepConfigDto getConfig(String stepId) {
        OnboardingStep step = stepRegistry.get(stepId);
        return configRepo.findById(stepId)
                .map(cfg -> toDto(step, cfg))
                .orElse(toDto(step, null));
    }

    /** Builds a {@link StepConfigDto} enriched with the current hardcoded default prompts. */
    private StepConfigDto toDto(OnboardingStep step, OnboardingStepConfig cfg) {
        OnboardingContext emptyCtx = emptyContext(step.getStepId());
        String defaultSystem    = safeDefault(() -> step.buildSystemPrompt(emptyCtx));
        String defaultExtraction= safeDefault(() -> step.buildExtractionPrompt(emptyCtx));
        return new StepConfigDto(
                step.getStepId(),
                cfg != null ? cfg.getSystemPromptOverride()     : null,
                cfg != null ? cfg.getExtractionPromptOverride() : null,
                cfg != null ? cfg.getAdminNotes()               : null,
                cfg != null ? cfg.getUpdatedAt()                : null,
                cfg != null ? cfg.getUpdatedBy()                : null,
                defaultSystem,
                defaultExtraction
        );
    }

    /**
     * Creates a minimal {@link OnboardingContext} with empty collected data (Italian locale).
     * Used only for rendering default prompts in the admin UI — never for production flows.
     */
    private static OnboardingContext emptyContext(String stepId) {
        OnboardingState stub = OnboardingState.builder()
                .currentStep(stepId)
                .collectedData(new HashMap<>())
                .completedSteps(new ArrayList<>())
                .missingFields(new ArrayList<>())
                .pendingActions(new ArrayList<>())
                .build();
        return new OnboardingContext(stub, null, Locale.ITALIAN);
    }

    /** Calls the supplier and returns the result, or an empty string on any exception. */
    private static String safeDefault(java.util.function.Supplier<String> fn) {
        try { return fn.get(); }
        catch (Exception e) { return ""; }
    }

    /**
     * Saves (upserts) the prompt override for a step and immediately invalidates the cache.
     * Pass {@code null} or blank strings to clear a field (revert to code default).
     */
    @Transactional
    public StepConfigDto saveConfig(String stepId, StepConfigDto dto, String updatedBy) {
        OnboardingStepConfig cfg = configRepo.findById(stepId)
                .orElseGet(() -> OnboardingStepConfig.builder().stepId(stepId).build());

        cfg.setSystemPromptOverride(blankToNull(dto.systemPromptOverride()));
        cfg.setExtractionPromptOverride(blankToNull(dto.extractionPromptOverride()));
        cfg.setAdminNotes(blankToNull(dto.adminNotes()));
        cfg.setUpdatedBy(updatedBy);
        cfg.setUpdatedAt(LocalDateTime.now());

        OnboardingStepConfig saved = configRepo.save(cfg);
        evict(stepId);
        log.info("Onboarding prompt config updated for {} by {}", stepId, updatedBy);

        return toDto(stepRegistry.get(stepId), saved);
    }

    /**
     * Removes the override for a step, reverting to the hardcoded Java default.
     */
    @Transactional
    public void deleteConfig(String stepId) {
        configRepo.deleteById(stepId);
        evict(stepId);
        log.info("Onboarding prompt config deleted for {} — reverted to code default", stepId);
    }

    // ─── Analytics ────────────────────────────────────────────────────────────

    /**
     * Computes per-step completion/stuck rates and per-field population rates.
     * Runs native JSONB queries; designed for low-frequency admin access only.
     */
    public OnboardingAnalyticsResponse computeAnalytics() {
        long totalUsers = stateRepo.countAll();
        if (totalUsers == 0) {
            return new OnboardingAnalyticsResponse(0, List.of());
        }

        List<OnboardingAnalyticsResponse.StepAnalyticsDto> steps = stepRegistry.getAll().stream()
                .map(step -> {
                    String stepId = step.getStepId();
                    long completed    = stateRepo.countCompletedStep(stepId);
                    long currentlyAt  = stateRepo.countCurrentlyAt(stepId);

                    List<OnboardingAnalyticsResponse.FieldPopulationDto> fields =
                            step.getChecklistItems().stream()
                                    .map(item -> {
                                        long populated = stateRepo.countUsersWithField(item.key());
                                        return new OnboardingAnalyticsResponse.FieldPopulationDto(
                                                item.key(),
                                                item.labelIt(),
                                                item.required(),
                                                populated,
                                                round(populated, totalUsers)
                                        );
                                    })
                                    .toList();

                    return new OnboardingAnalyticsResponse.StepAnalyticsDto(
                            stepId,
                            step.getStepNumber(),
                            completed,
                            currentlyAt,
                            round(completed, totalUsers),
                            round(currentlyAt, totalUsers),
                            fields
                    );
                })
                .toList();

        return new OnboardingAnalyticsResponse(totalUsers, steps);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static double round(long count, long total) {
        return total == 0 ? 0.0 : Math.round((double) count / total * 1000.0) / 10.0;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }
}
