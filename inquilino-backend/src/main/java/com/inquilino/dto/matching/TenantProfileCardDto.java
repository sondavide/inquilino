package com.inquilino.dto.matching;

import com.inquilino.entity.Match;
import com.inquilino.entity.TenantProfile;
import com.inquilino.entity.User;
import com.inquilino.enums.EmploymentType;
import com.inquilino.enums.MatchState;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Vista anonimizzata di un profilo tenant per il locatore.
 * I campi identificativi (nome, email, telefono) sono esposti
 * solo quando matchState = CONTACT_UNLOCKED.
 *
 * GDPR: nessun dato identificativo nelle bande algorithmic/interested.
 */
public record TenantProfileCardDto(
        UUID   matchId,
        String matchState,
        String matchBand,
        double matchScore,

        // Identità anonima
        String profileCode,         // "T-XXXX" (ultimi 4 chars dell'ID)
        String ageRange,            // "25–34"
        String occupationCategory,
        String incomeRange,         // "1800–2500"
        int    occupants,
        boolean hasPets,
        boolean smoker,
        boolean hasGuarantor,

        // Budget: solo indicatore di compliance, non il valore esatto
        String  budgetCompliance,   // "Compatibile" | "Vicino (+X%)" | "Oltre il budget"
        LocalDate moveInDate,

        // Affidabilità (categorie)
        String rentSustainability,
        String incomeStability,
        String documentReliability,
        int    profileCompletion,
        String verificationStatus,

        // AI-generated
        String matchSummary,
        String recommendation,      // Consiglio per il locatore basato su band + strength

        // Contatti — solo se CONTACT_UNLOCKED
        String fullName,
        String email,
        String phone
) {
    public static TenantProfileCardDto from(
            Match match,
            TenantProfile profile,
            User user,
            String rentSustainability,
            String incomeStability,
            String documentReliability) {

        boolean unlocked = match.getMatchState() == MatchState.CONTACT_UNLOCKED;

        String budgetCompliance = budgetCompliance(
                match.getPriceBand(), match.getPriceDeltaPercentage());

        String recommendation = recommendation(
                match.getMatchBand() != null ? match.getMatchBand().name() : null,
                match.getTenantStrengthScore());

        return new TenantProfileCardDto(
                match.getId(),
                match.getMatchState().name(),
                match.getMatchBand() != null ? match.getMatchBand().name() : null,
                match.getMatchScoreLandlord() != null ? match.getMatchScoreLandlord() : 0,

                "T-" + profile.getId().toString().substring(0, 4).toUpperCase(),
                ageRange(profile.getBirthDate()),
                occupationCategory(profile.getEmploymentType()),
                incomeRange(profile.getMonthlyIncome()),
                profile.getOccupants() != null ? profile.getOccupants() : 1,
                profile.isHasPets(),
                profile.isSmoker(),
                profile.isHasGuarantor(),

                budgetCompliance,
                profile.getMoveInDate(),

                rentSustainability,
                incomeStability,
                documentReliability,
                profile.getProfileCompletion(),
                profile.getVerificationStatus().name(),

                match.getMatchSummary(),
                recommendation,

                // Identità: solo se contact_unlocked
                unlocked ? profile.getFullName() : null,
                unlocked ? user.getEmail()       : null,
                unlocked ? user.getPhone()        : null
        );
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private static String budgetCompliance(String priceBand, Double delta) {
        if (priceBand == null) return null;
        return switch (priceBand) {
            case "within_budget"    -> "Compatibile";
            case "within_tolerance" -> delta != null
                    ? "Vicino (+%.0f%%)".formatted(delta) : "Vicino al limite";
            case "over_budget"      -> "Oltre il budget";
            default                 -> null;
        };
    }

    private static String recommendation(String band, Double strength) {
        if (band == null) return null;
        double s = strength != null ? strength : 0;
        return switch (band) {
            case "EXCELLENT_MATCH" -> s >= 60
                    ? "Profilo eccellente e solido. Si consiglia di procedere subito con l'invito."
                    : "Ottima compatibilità. Vale la pena approfondire il profilo.";
            case "GOOD_MATCH" -> s >= 60
                    ? "Buon profilo con solidità adeguata. Contatto consigliato."
                    : "Buona compatibilità. Valuta la solidità prima di procedere.";
            case "MEDIUM_MATCH" ->
                    "Compatibilità nella media. Conviene attendere candidati più adatti.";
            case "WEAK_MATCH" ->
                    "Compatibilità debole. Si consiglia di attendere profili migliori.";
            default -> null;
        };
    }

    private static String ageRange(LocalDate birthDate) {
        if (birthDate == null) return null;
        int age = (int) java.time.temporal.ChronoUnit.YEARS.between(birthDate, LocalDate.now());
        if (age < 25) return "18–24";
        if (age < 35) return "25–34";
        if (age < 45) return "35–44";
        if (age < 55) return "45–54";
        return "55+";
    }

    private static String occupationCategory(EmploymentType type) {
        if (type == null) return null;
        return type.name();
    }

    private static String incomeRange(java.math.BigDecimal income) {
        if (income == null) return null;
        double v = income.doubleValue();
        if (v <  1200) return "0–1200";
        if (v <  1800) return "1200–1800";
        if (v <  2500) return "1800–2500";
        if (v <  3500) return "2500–3500";
        return "3500+";
    }
}
