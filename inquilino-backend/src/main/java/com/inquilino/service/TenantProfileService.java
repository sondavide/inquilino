package com.inquilino.service;

import com.inquilino.entity.OnboardingState;
import com.inquilino.entity.TenantProfile;
import com.inquilino.entity.User;
import com.inquilino.enums.EmploymentType;
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
 * The onboarding flow never directly writes to tenant_profiles — all answers live in
 * onboarding_states.collected_data.  When the tenant first accesses their profile page
 * we call getOrSync() which reads that JSONB and creates the TenantProfile row.
 * Subsequent profile edits go through TenantController.updateProfile() directly.
 */
@Service
@RequiredArgsConstructor
public class TenantProfileService {

    private final TenantProfileRepository  profileRepo;
    private final OnboardingStateRepository onboardingRepo;
    private final UserService userService;

    /**
     * Returns the existing TenantProfile or creates one by reading the onboarding
     * collected data. Safe to call on every GET /api/tenant/profile.
     */
    public TenantProfile getOrSync(UUID userId) {
        return profileRepo.findByUserId(userId)
                .orElseGet(() -> syncFromOnboarding(userId));
    }

    // ─── Private ─────────────────────────────────────────────────────────────────

    private TenantProfile syncFromOnboarding(UUID userId) {
        User user  = userService.findById(userId);
        OnboardingState state = onboardingRepo.findByUserId(userId).orElse(null);

        TenantProfile.TenantProfileBuilder b = TenantProfile.builder().user(user);

        if (state != null && state.getCollectedData() != null) {
            Map<String, Object> d = state.getCollectedData();

            // Identity (Step 03)
            b.fullName(str(d.get("full_name")));
            b.birthDate(parseDate(d.get("birth_date")));
            b.birthPlace(str(d.get("birth_place")));
            b.residence(str(d.get("residence")));
            b.fiscalCode(str(d.get("fiscal_code")));

            // Employment (Step 09)
            b.employmentType(parseEmploymentType(d.get("employment_type")));
            b.contractType(str(d.get("contract_type")));
            b.employmentStartDate(parseDate(d.get("employment_start_date")));

            // Income (Step 10)
            b.monthlyIncome(parseBigDecimal(d.get("monthly_income")));

            // Guarantor (Step 11)
            b.hasGuarantor(parseBool(d.get("has_guarantor")));
            b.guarantorIncome(parseBigDecimal(d.get("guarantor_income")));

            // Property preferences (Step 07)
            b.maxBudget(parseBigDecimal(d.get("max_budget")));

            // Move-in date comes from Step 05 (desired_move_date)
            b.moveInDate(parseDate(d.get("desired_move_date")));

            // Household (Step 08)
            b.occupants(parseInteger(d.get("occupants_count")));
            b.hasPets(parseBool(d.get("has_pets")));
        }

        return profileRepo.save(b.build());
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
        // ISO format YYYY-MM-DD
        try { return LocalDate.parse(s); } catch (Exception ignored) {}
        // dd/MM/yyyy
        try { return LocalDate.parse(s, DateTimeFormatter.ofPattern("dd/MM/yyyy")); } catch (Exception ignored) {}
        // d/M/yyyy
        try { return LocalDate.parse(s, DateTimeFormatter.ofPattern("d/M/yyyy")); } catch (Exception ignored) {}
        return null; // natural-language dates (e.g. "tra 3 mesi") are left null
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
