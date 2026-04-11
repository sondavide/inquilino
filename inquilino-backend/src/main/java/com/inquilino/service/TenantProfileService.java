package com.inquilino.service;

import com.inquilino.entity.OnboardingState;
import com.inquilino.entity.TenantProfile;
import com.inquilino.entity.User;
import com.inquilino.enums.EmploymentType;
import com.inquilino.enums.VerificationStatus;
import com.inquilino.repository.OnboardingStateRepository;
import com.inquilino.repository.TenantProfileRepository;
import com.inquilino.security.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

/**
 * Bridges the onboarding JSONB (collectedData) and the normalised TenantProfile entity.
 *
 * Profile creation/update lifecycle:
 *  1. getOrSync()        — called on GET /api/tenant/profile; creates an empty row if missing.
 *  2. syncOnCompletion() — called by OnboardingService when step advances to STEP_18;
 *                          full overwrite of all onboarding fields + promotes to PENDING_VALIDATION.
 *  3. TenantController.updateProfile() — handles manual edits after onboarding.
 */
@Service
@RequiredArgsConstructor
public class TenantProfileService {

    private final TenantProfileRepository   profileRepo;
    private final OnboardingStateRepository onboardingRepo;
    private final UserService               userService;

    /**
     * Returns the existing TenantProfile, or creates an empty one if it doesn't exist yet.
     * Does NOT sync onboarding data — that is done eagerly by syncOnCompletion().
     */
    public TenantProfile getOrSync(UUID userId) {
        return profileRepo.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userService.findById(userId);
                    return profileRepo.save(TenantProfile.builder().user(user).build());
                });
    }

    /**
     * Full sync from onboarding collected data. Called once when onboarding reaches STEP_18.
     * Overwrites all profile fields (including booleans) and promotes status to PENDING_VALIDATION.
     */
    public void syncOnCompletion(UUID userId) {
        User            user  = userService.findById(userId);
        OnboardingState state = onboardingRepo.findByUserId(userId).orElse(null);
        if (state == null || state.getCollectedData() == null) return;

        Map<String, Object> d = state.getCollectedData();

        TenantProfile p = profileRepo.findByUserId(userId)
                .orElseGet(() -> TenantProfile.builder().user(user).build());

        // Identity (Step 03)
        p.setFullName(str(d.get("full_name")));
        p.setBirthDate(parseDate(d.get("birth_date")));
        p.setBirthPlace(str(d.get("birth_place")));
        p.setResidence(str(d.get("residence")));
        p.setFiscalCode(str(d.get("fiscal_code")));

        // Employment (Step 09)
        p.setEmploymentType(parseEmploymentType(d.get("employment_type")));
        p.setContractType(str(d.get("contract_type")));
        p.setEmploymentStartDate(parseDate(d.get("employment_start_date")));

        // Income (Step 10)
        p.setMonthlyIncome(parseBigDecimal(d.get("monthly_income")));

        // Guarantor (Step 11)
        p.setHasGuarantor(parseBool(d.get("has_guarantor")));
        p.setGuarantorIncome(parseBigDecimal(d.get("guarantor_income")));

        // Property preferences (Step 07)
        p.setMaxBudget(parseBigDecimal(d.get("max_budget")));

        // Move-in date (Step 05)
        p.setMoveInDate(parseDate(d.get("desired_move_date")));

        // Household (Step 08)
        p.setOccupants(parseInteger(d.get("occupants_count")));
        p.setHasPets(parseBool(d.get("has_pets")));
        p.setSmoker(parseBool(d.get("smoker")));

        // Promote to PENDING_VALIDATION only if not already in a later status
        if (p.getVerificationStatus() == VerificationStatus.NONE
                || p.getVerificationStatus() == VerificationStatus.PARTIAL) {
            p.setVerificationStatus(VerificationStatus.PENDING_VALIDATION);
        }

        p.setProfileCompletion(100);
        profileRepo.save(p);
    }

    /**
     * Persists the current profile-completion percentage (0-100) derived from
     * the onboarding checklist. Called after every step advance.
     */
    public void updateProfileCompletion(UUID userId, int completionPct) {
        profileRepo.findByUserId(userId).ifPresent(p -> {
            p.setProfileCompletion(completionPct);
            profileRepo.save(p);
        });
    }

    // ─── Parsing helpers ──────────────────────────────────────────────────────────

    private String str(Object v) {
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private LocalDate parseDate(Object v) {
        if (v == null) return null;
        String s = v.toString().trim();
        try { return LocalDate.parse(s); } catch (Exception ignored) {}
        try { return LocalDate.parse(s, DateTimeFormatter.ofPattern("dd/MM/yyyy")); } catch (Exception ignored) {}
        try { return LocalDate.parse(s, DateTimeFormatter.ofPattern("d/M/yyyy")); } catch (Exception ignored) {}
        return null;
    }

    private BigDecimal parseBigDecimal(Object v) {
        if (v == null) return null;
        try { return new BigDecimal(v.toString().replaceAll("[^0-9.]", "")); } catch (Exception e) { return null; }
    }

    private Integer parseInteger(Object v) {
        if (v == null) return null;
        try { return Integer.parseInt(v.toString().trim()); } catch (Exception e) { return null; }
    }

    private boolean parseBool(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        String s = v.toString().toLowerCase().trim();
        return "true".equals(s) || "yes".equals(s) || "si".equals(s) || "sì".equals(s) || "1".equals(s);
    }

    private EmploymentType parseEmploymentType(Object v) {
        if (v == null) return null;
        try { return EmploymentType.valueOf(v.toString().toUpperCase().trim()); }
        catch (Exception e) { return null; }
    }
}
