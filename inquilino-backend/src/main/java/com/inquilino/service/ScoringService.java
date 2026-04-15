package com.inquilino.service;

import com.inquilino.dto.supervisor.ScoreBreakdownDto;
import com.inquilino.dto.supervisor.ScoreBreakdownDto.*;
import com.inquilino.dto.supervisor.ScoreDetailDto;
import com.inquilino.dto.tenant.ScoreDto;
import com.inquilino.entity.Document;
import com.inquilino.entity.FieldValidation;
import com.inquilino.entity.Guarantor;
import com.inquilino.entity.ScoreOverride;
import com.inquilino.entity.ScoringTemplate;
import com.inquilino.entity.TenantProfile;
import com.inquilino.enums.ContractType;
import com.inquilino.enums.DocumentType;
import com.inquilino.enums.EmploymentType;
import com.inquilino.enums.FieldValidationStatus;
import com.inquilino.repository.FieldValidationRepository;
import com.inquilino.repository.GuarantorRepository;
import com.inquilino.repository.ScoringTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Calcola i tre indicatori categoriali di affidabilità per un profilo tenant.
 *
 * ─── MODELLO ──────────────────────────────────────────────────────────────────
 *
 * 1. rent_sustainability
 *    Usa il reddito verificato (se il supervisore ha impostato verified_value su
 *    monthlyIncome) o il dichiarato. Aggiunge credito parziale dai garanti.
 *    Soglie configurabili nel ScoringTemplate (default 30%/50%).
 *
 * 2. income_stability — sommatoria A+B+C+D (max 100)
 *    A: base occupazione (0–45 pt)   — tipo impiego + tipo contratto
 *    B: continuità (0–25 pt)         — anzianità da employmentStartDate
 *    C: verifica reddito (0–20 pt)   — livello di verifica del reddito
 *    D: rete di sicurezza (0–10 pt)  — garanti verificati o dichiarati
 *    Per STUDENT: combined = student_score*0.30 + family_score*0.70
 *
 * 3. document_reliability — punteggio pesato per tipo documento (max 100)
 *    Ogni tipo di documento approvato dal supervisore contribuisce con il suo peso.
 *    Configurabile nel ScoringTemplate.
 *
 * Tutti i parametri (soglie, pesi) si leggono dal ScoringTemplate assegnato al
 * profilo. Se non assegnato, si usano i valori di default dell'entità.
 */
@Service
@RequiredArgsConstructor
public class ScoringService {

    private final FieldValidationRepository  fieldValidationRepo;
    private final GuarantorRepository        guarantorRepo;
    private final ScoringTemplateRepository  scoringTemplateRepo;

    // ─── Calcolo semplice (usato da tenant e matching) ───────────────────────

    public ScoreDto calculate(TenantProfile profile, List<Document> documents) {
        UUID pid = profile != null ? profile.getId() : null;
        ScoringTemplate tpl = loadTemplate(profile);
        List<Guarantor> guarantors = pid != null
                ? guarantorRepo.findByTenantProfileIdOrderByCreatedAtAsc(pid)
                : List.of();
        return new ScoreDto(
                rentSustainabilityLevel(profile, guarantors, tpl),
                incomeStabilityLevel(profile, guarantors, tpl, pid),
                documentReliabilityLevel(documents, pid, guarantors, tpl),
                profile != null ? profile.getProfileCompletion() : 0
        );
    }

    // ─── Calcolo dettagliato (pannello supervisore — ScoreDetailDto) ─────────

    public ScoreDetailDto calculateDetail(TenantProfile profile, List<Document> documents,
                                          ScoreOverride override) {
        UUID pid = profile != null ? profile.getId() : null;
        ScoringTemplate tpl = loadTemplate(profile);
        List<Guarantor> guarantors = pid != null
                ? guarantorRepo.findByTenantProfileIdOrderByCreatedAtAsc(pid)
                : List.of();

        String algoRent   = rentSustainabilityLevel(profile, guarantors, tpl);
        String algoIncome = incomeStabilityLevel(profile, guarantors, tpl, pid);
        String algoDoc    = documentReliabilityLevel(documents, pid, guarantors, tpl);
        int completion    = profile != null ? profile.getProfileCompletion() : 0;

        String overrideRent   = override != null ? override.getRentSustainability()  : null;
        String overrideIncome = override != null ? override.getIncomeStability()      : null;
        String overrideDoc    = override != null ? override.getDocumentReliability()  : null;
        String overrideReason = override != null ? override.getReason()               : null;

        return new ScoreDetailDto(
                algoRent,   rentExplanation(profile, guarantors, tpl),
                algoIncome, incomeExplanation(profile, guarantors, tpl, pid),
                algoDoc,    docExplanation(documents, pid, guarantors, tpl),
                completion,
                overrideRent, overrideIncome, overrideDoc, overrideReason,
                overrideRent   != null ? overrideRent   : algoRent,
                overrideIncome != null ? overrideIncome : algoIncome,
                overrideDoc    != null ? overrideDoc    : algoDoc
        );
    }

    // ─── Breakdown completo con suggerimenti (pannello supervisore) ──────────

    public ScoreBreakdownDto calculateBreakdown(TenantProfile profile, List<Document> documents,
                                                ScoreOverride override) {
        UUID pid = profile != null ? profile.getId() : null;
        ScoringTemplate tpl = loadTemplate(profile);
        List<Guarantor> guarantors = pid != null
                ? guarantorRepo.findByTenantProfileIdOrderByCreatedAtAsc(pid)
                : List.of();

        RentBreakdown  rent   = buildRentBreakdown(profile, guarantors, tpl);
        IncomeBreakdown income = buildIncomeBreakdown(profile, guarantors, tpl, pid);
        DocBreakdown    docs   = buildDocBreakdown(documents, pid, guarantors, tpl);

        List<ScoreSuggestion> suggestions = buildSuggestions(rent, income, docs, tpl);

        return new ScoreBreakdownDto(
                rent, income, docs,
                override != null ? override.getRentSustainability()  : null,
                override != null ? override.getIncomeStability()      : null,
                override != null ? override.getDocumentReliability()  : null,
                override != null ? override.getReason()               : null,
                profile != null ? profile.getProfileCompletion() : 0,
                suggestions
        );
    }

    // ─── Accessori pubblici per MatchingService ──────────────────────────────

    public String incomeStabilityCategory(TenantProfile p) {
        if (p == null) return "LOW";
        ScoringTemplate tpl = loadTemplate(p);
        List<Guarantor> gs = guarantorRepo.findByTenantProfileIdOrderByCreatedAtAsc(p.getId());
        return incomeStabilityLevel(p, gs, tpl, p.getId());
    }

    public String documentReliabilityCategory(List<Document> docs, UUID tenantProfileId) {
        if (tenantProfileId == null) return "LOW";
        ScoringTemplate tpl = loadTemplateById(tenantProfileId);
        List<Guarantor> gs = guarantorRepo.findByTenantProfileIdOrderByCreatedAtAsc(tenantProfileId);
        return documentReliabilityLevel(docs, tenantProfileId, gs, tpl);
    }

    public Set<String> getSupervisorApprovedDocFields(UUID tenantProfileId) {
        if (tenantProfileId == null) return Set.of();
        return fieldValidationRepo
                .findByTenantProfileIdAndStatus(tenantProfileId, FieldValidationStatus.APPROVED)
                .stream()
                .map(FieldValidation::getFieldName)
                .filter(f -> f.startsWith("doc."))
                .collect(Collectors.toSet());
    }

    // ═════════════════════════════════════════════════════════════════════════
    // RENT SUSTAINABILITY
    // ═════════════════════════════════════════════════════════════════════════

    private String rentSustainabilityLevel(TenantProfile p, List<Guarantor> guarantors,
                                           ScoringTemplate tpl) {
        return buildRentBreakdown(p, guarantors, tpl).level();
    }

    private RentBreakdown buildRentBreakdown(TenantProfile p, List<Guarantor> guarantors,
                                             ScoringTemplate tpl) {
        if (p == null || p.getMaxBudget() == null) {
            return new RentBreakdown(null, null, null, null, null, null, null, null,
                    "LOW", "Dati insufficienti (affitto massimo non dichiarato) → LOW");
        }

        // Reddito dichiarato
        BigDecimal declared = p.getMonthlyIncome();
        if (declared == null || declared.doubleValue() <= 0) {
            return new RentBreakdown(declared, null, null, null, null, null,
                    p.getMaxBudget(), null, "LOW", "Reddito dichiarato assente o zero → LOW");
        }

        // Reddito verificato (da FieldValidation.verifiedValue su "monthlyIncome")
        BigDecimal verified = getVerifiedIncome(p.getId());

        BigDecimal incomeUsed = verified != null ? verified : declared;

        // Credito garanti: somma del reddito effettivo di tutti i garanti × creditPct
        // Il supervisore può sovrascrivere il totale aggregato tramite FieldValidation "guarantorTotalIncome"
        double creditPct = tpl.getGuarantorIncomeCreditPct() / 100.0;
        BigDecimal guarantorTotalOverride = getVerifiedGuarantorTotal(p.getId());
        BigDecimal guarantorTotal = guarantorTotalOverride != null ? guarantorTotalOverride :
                guarantors.stream()
                        .map(g -> g.getVerifiedMonthlyIncome() != null
                                ? g.getVerifiedMonthlyIncome()
                                : (g.getDeclaredMonthlyIncome() != null ? g.getDeclaredMonthlyIncome() : BigDecimal.ZERO))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal guarantorCredit = guarantorTotal.multiply(BigDecimal.valueOf(creditPct));
        BigDecimal effective = incomeUsed.add(guarantorCredit);

        double ratio = p.getMaxBudget().doubleValue() / effective.doubleValue() * 100.0;

        int highPct   = tpl.getRentHighThresholdPct();
        int mediumPct = tpl.getRentMediumThresholdPct();
        String level  = ratio <= highPct ? "HIGH" : ratio <= mediumPct ? "MEDIUM" : "LOW";

        String explanation = String.format(
                "Reddito usato: €%.0f%s · Credito garante: €%.0f · Reddito effettivo: €%.0f · " +
                "Affitto max: €%.0f · Ratio: %.1f%% · Soglie: ≤%d%% HIGH · %d–%d%% MEDIUM · >%d%% LOW",
                incomeUsed.doubleValue(),
                verified != null ? " (verificato)" : " (dichiarato)",
                guarantorCredit.doubleValue(),
                effective.doubleValue(),
                p.getMaxBudget().doubleValue(),
                ratio, highPct, highPct, mediumPct, mediumPct);

        return new RentBreakdown(declared, verified, incomeUsed,
                guarantorTotal, guarantorCredit, effective,
                p.getMaxBudget(), ratio, level, explanation);
    }

    private BigDecimal getVerifiedIncome(UUID tenantProfileId) {
        if (tenantProfileId == null) return null;
        return fieldValidationRepo
                .findByTenantProfileIdAndFieldName(tenantProfileId, "monthlyIncome")
                .map(FieldValidation::getVerifiedValue)
                .filter(v -> v != null && !v.isBlank())
                .map(v -> { try { return new BigDecimal(v); } catch (Exception e) { return null; } })
                .orElse(null);
    }

    /**
     * Reddito complessivo dei garanti verificato dal supervisore come valore aggregato.
     * Se null, il servizio somma i redditi per-garante.
     */
    private BigDecimal getVerifiedGuarantorTotal(UUID tenantProfileId) {
        if (tenantProfileId == null) return null;
        return fieldValidationRepo.findByTenantProfileIdAndFieldName(tenantProfileId, "guarantorTotalIncome")
                .map(FieldValidation::getVerifiedValue)
                .filter(v -> v != null && !v.isBlank())
                .map(v -> { try { return new BigDecimal(v); } catch (Exception e) { return null; } })
                .orElse(null);
    }

    /** Returns a supervisor-set verified value for a string/enum field, or null if not set. */
    private String getVerifiedStringValue(UUID tenantProfileId, String fieldName) {
        if (tenantProfileId == null) return null;
        return fieldValidationRepo.findByTenantProfileIdAndFieldName(tenantProfileId, fieldName)
                .map(FieldValidation::getVerifiedValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(null);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // INCOME STABILITY — sommatoria A + B + C + D (max 100)
    // ═════════════════════════════════════════════════════════════════════════

    private String incomeStabilityLevel(TenantProfile p, List<Guarantor> guarantors,
                                        ScoringTemplate tpl, UUID pid) {
        return buildIncomeBreakdown(p, guarantors, tpl, pid).level();
    }

    private IncomeBreakdown buildIncomeBreakdown(TenantProfile p, List<Guarantor> guarantors,
                                                  ScoringTemplate tpl, UUID pid) {
        if (p == null || p.getEmploymentType() == null) {
            return emptyIncomeBreakdown("LOW", "Tipo di impiego non dichiarato → LOW");
        }

        // Supervisor-verified overrides for employment classification fields
        EmploymentType effectiveEt = p.getEmploymentType();
        String vetStr = getVerifiedStringValue(pid, "employmentType");
        if (vetStr != null) {
            try { effectiveEt = EmploymentType.valueOf(vetStr); } catch (Exception ignored) {}
        }
        ContractType effectiveCt = p.getContractType();
        String vctStr = getVerifiedStringValue(pid, "contractType");
        if (vctStr != null) {
            try { effectiveCt = ContractType.valueOf(vctStr); } catch (Exception ignored) {}
        }

        boolean isStudent = effectiveEt == EmploymentType.STUDENT;

        // ── Fattore A: base occupazione ──────────────────────────────────
        int factorA; String factorAExpl;
        var fa = calcFactorA(effectiveEt, effectiveCt, p.getEmploymentEndDate());
        factorA = fa.points(); factorAExpl = fa.explanation();

        // ── Fattore B: continuità ─────────────────────────────────────────
        // Il supervisore può sovrascrivere la data di inizio tramite "employmentStartDate"
        int factorB; String factorBExpl;
        if (effectiveEt == EmploymentType.RETIRED) {
            factorB = 25; factorBExpl = "Pensionato: continuità permanente → 25 pt";
        } else {
            LocalDate effectiveStartDate = p.getEmploymentStartDate();
            String startDateStr = getVerifiedStringValue(pid, "employmentStartDate");
            if (startDateStr != null) {
                try { effectiveStartDate = LocalDate.parse(startDateStr); } catch (Exception ignored) {}
            }
            var fb = calcFactorB(effectiveStartDate);
            factorB = fb.points();
            factorBExpl = (startDateStr != null ? "[data verificata] " : "") + fb.explanation();
        }

        // ── Fattore C: verifica documentale reddito ────────────────────
        int factorC; String factorCExpl;
        var fc = calcFactorC(pid);
        factorC = fc.points(); factorCExpl = fc.explanation();

        // ── Fattore D: qualità garanti (reddito garanti / budget) ───────
        // Il supervisore può sovrascrivere il totale aggregato tramite "guarantorTotalIncome"
        BigDecimal guarantorTotalOverride = getVerifiedGuarantorTotal(pid);
        int factorD; String factorDExpl;
        var fd = calcFactorD(guarantors, p.getMaxBudget(), guarantorTotalOverride);
        factorD = fd.points(); factorDExpl = fd.explanation();

        int totalScore = factorA + factorB + factorC + factorD;

        // ── Formula studente: combinazione con family score ─────────────
        if (isStudent && !guarantors.isEmpty()) {
            int familyWeightPct   = tpl.getStudentFamilyWeightPct();
            int studentWeightPct  = 100 - familyWeightPct;
            double familyWeight   = familyWeightPct / 100.0;
            double studentWeight  = studentWeightPct / 100.0;

            // Best guarantor family score (qualità del singolo garante vs budget)
            int familyScore = guarantors.stream()
                    .mapToInt(g -> calcFamilyScore(g, tpl, p.getMaxBudget()))
                    .max().orElse(0);
            int familyA = guarantors.stream()
                    .mapToInt(g -> calcFactorA(g.getEmploymentType(), g.getContractType(), g.getEmploymentEndDate()).points())
                    .max().orElse(0);
            int familyB = guarantors.stream()
                    .mapToInt(g -> calcFactorB(g.getEmploymentStartDate()).points())
                    .max().orElse(0);
            int familyC = calcFactorCGuarantor(guarantors, pid);
            int familyD = calcFactorDMultiple(guarantors, p.getMaxBudget(), guarantorTotalOverride);

            int combined = (int) Math.round(totalScore * studentWeight + familyScore * familyWeight);
            combined = Math.min(combined, 100);
            String level = scoreToLevel(combined, tpl);

            String familyExpl = String.format(
                    "Miglior garante: A=%d B=%d C=%d D=%d = %d · combined=%.0f%%×%d + %.0f%%×%d = %d",
                    familyA, familyB, familyC, familyD, familyScore,
                    studentWeight * 100, totalScore, familyWeight * 100, familyScore, combined);

            return new IncomeBreakdown(
                    effectiveEt.name(),
                    effectiveCt != null ? effectiveCt.name() : null,
                    factorA, factorAExpl, factorB, factorBExpl,
                    factorC, factorCExpl, factorD, factorDExpl,
                    totalScore, level,
                    true, familyScore, familyA, familyB, familyC, familyD,
                    familyExpl, combined, studentWeightPct, familyWeightPct
            );
        }

        // Non studente o studente senza garanti
        // Studente senza garanti: cap a MEDIUM
        String level;
        if (isStudent && guarantors.isEmpty()) {
            int capped = Math.min(totalScore, tpl.getStabilityMediumThreshold() - 1);
            level = scoreToLevel(capped, tpl);
        } else {
            level = scoreToLevel(totalScore, tpl);
        }

        return new IncomeBreakdown(
                effectiveEt.name(),
                effectiveCt != null ? effectiveCt.name() : null,
                factorA, factorAExpl, factorB, factorBExpl,
                factorC, factorCExpl, factorD, factorDExpl,
                totalScore, level,
                isStudent, null, null, null, null, null,
                isStudent ? "Nessun garante: cap a MEDIUM" : null,
                isStudent ? Math.min(totalScore, tpl.getStabilityMediumThreshold() - 1) : totalScore,
                null, null
        );
    }

    // ── Fattore A: base occupazione ───────────────────────────────────────────

    private record Points(int points, String explanation) {}

    private Points calcFactorA(EmploymentType et, ContractType ct, LocalDate endDate) {
        if (et == null) return new Points(0, "Tipo impiego non dichiarato → 0 pt");
        return switch (et) {
            case RETIRED -> new Points(45, "Pensionato → 45 pt");
            case EMPLOYEE -> {
                if (ct == null) yield new Points(30, "Dipendente (contratto non specificato) → 30 pt");
                yield switch (ct) {
                    case PERMANENT     -> new Points(45, "Dipendente a tempo indeterminato → 45 pt");
                    case FIXED_TERM    -> {
                        long months = endDate != null
                                ? ChronoUnit.MONTHS.between(LocalDate.now(), endDate)
                                : 0L;
                        if (months >= 12) yield new Points(35, "Dipendente determinato ≥12 mesi al termine → 35 pt");
                        if (months >= 6)  yield new Points(25, "Dipendente determinato 6–11 mesi al termine → 25 pt");
                        yield new Points(15, "Dipendente determinato <6 mesi al termine → 15 pt");
                    }
                    case APPRENTICESHIP -> new Points(20, "Apprendistato → 20 pt");
                    case INTERNSHIP     -> new Points(10, "Stage/tirocinio → 10 pt");
                    default             -> new Points(25, "Dipendente contratto altro → 25 pt");
                };
            }
            case SELF_EMPLOYED -> new Points(30, "Lavoratore autonomo/libero professionista → 30 pt");
            case STUDENT -> ct == null
                    ? new Points(5,  "Studente senza reddito dichiarato → 5 pt")
                    : new Points(10, "Studente con reddito/borsa dichiarata → 10 pt");
            case OTHER -> new Points(15, "Altra occupazione → 15 pt");
        };
    }

    // ── Fattore B: continuità ─────────────────────────────────────────────────

    private Points calcFactorB(LocalDate startDate) {
        if (startDate == null) return new Points(0, "Data inizio non dichiarata → 0 pt");
        long years = ChronoUnit.YEARS.between(startDate, LocalDate.now());
        long months = ChronoUnit.MONTHS.between(startDate, LocalDate.now());
        if (years > 5)        return new Points(25, String.format("%d anni → 25 pt", years));
        if (years >= 3)       return new Points(20, String.format("%d anni → 20 pt", years));
        if (years >= 1)       return new Points(12, String.format("%d anni → 12 pt", years));
        if (months >= 6)      return new Points(6,  String.format("%d mesi → 6 pt", months));
        return new Points(0,  String.format("%d mesi → 0 pt", months));
    }

    // ── Fattore C: verifica documentale del reddito ───────────────────────────

    private Points calcFactorC(UUID tenantProfileId) {
        if (tenantProfileId == null) return new Points(0, "Profilo non trovato → 0 pt");

        // Verifiedvalue presente → supervisore ha corretto il valore
        boolean hasVerifiedValue = fieldValidationRepo
                .findByTenantProfileIdAndFieldName(tenantProfileId, "monthlyIncome")
                .map(fv -> fv.getVerifiedValue() != null && !fv.getVerifiedValue().isBlank())
                .orElse(false);
        if (hasVerifiedValue) return new Points(20, "Reddito verificato dal supervisore con valore corretto → 20 pt");

        // Documenti reddituali approvati (buste paga, 730, estratto conto, contratto)
        Set<String> approved = getSupervisorApprovedDocFields(tenantProfileId);
        Set<String> incomeDocFields = Set.of("doc.PAYSLIP", "doc.TAX_RETURN",
                "doc.BANK_STATEMENT", "doc.EMPLOYMENT_CONTRACT");
        boolean hasApprovedIncomeDoc = incomeDocFields.stream().anyMatch(approved::contains);
        if (hasApprovedIncomeDoc) return new Points(12, "Documenti reddituali approvati (valore non verificato) → 12 pt");

        // Documenti caricati ma non ancora revisionati
        Set<String> pending = fieldValidationRepo
                .findByTenantProfileId(tenantProfileId).stream()
                .filter(fv -> fv.getStatus() == FieldValidationStatus.PENDING)
                .map(FieldValidation::getFieldName)
                .filter(f -> f.startsWith("doc."))
                .collect(Collectors.toSet());
        if (!pending.isEmpty()) return new Points(5, "Documenti caricati in attesa di revisione → 5 pt");

        return new Points(0, "Solo autodichiarazione, nessun documento → 0 pt");
    }

    // ── Fattore C per garante ─────────────────────────────────────────────────

    private int calcFactorCGuarantor(List<Guarantor> guarantors, UUID tenantProfileId) {
        // Cerca il garante con reddito verificato
        boolean anyVerified = guarantors.stream().anyMatch(Guarantor::isIncomeVerified);
        if (anyVerified) return 20;

        // Documenti del garante approvati (da Document con guarantorId)
        if (tenantProfileId != null) {
            Set<String> approved = getSupervisorApprovedDocFields(tenantProfileId);
            boolean hasGuarantorApproved = approved.stream()
                    .anyMatch(f -> f.startsWith("doc.GUARANTOR_") || f.equals("doc.GUARANTOR_DOCUMENT"));
            if (hasGuarantorApproved) return 12;
        }
        return 0;
    }

    // ── Fattore D: qualità garanti ────────────────────────────────────────────
    //
    // Il punteggio non è più binario (presenza/assenza) ma dipende dalla
    // qualità del garante, definita come:
    //   qualità = reddito_totale_garanti / budget_affitto_tenant
    //
    // Soglie (fisse — possono essere spostate in ScoringTemplate in futuro):
    //   ratio ≥ 2×  → qualità ALTA  → 10 pt
    //   ratio ≥ 1×  → qualità MEDIA → 7 pt
    //   ratio ≥ 0.5×→ qualità BASSA → 5 pt
    //   ratio < 0.5×→ insufficiente → 3 pt
    //   reddito solo dichiarato (non verificato) → 2 pt
    //   nessun garante → 0 pt
    //
    // Se il budget non è dichiarato, si usa un punteggio fisso in base alla
    // presenza/assenza di reddito verificato (compatibilità).

    private static final double GUARANTOR_QUALITY_HIGH   = 2.0;
    private static final double GUARANTOR_QUALITY_MEDIUM = 1.0;
    private static final double GUARANTOR_QUALITY_LOW    = 0.5;

    private Points calcFactorD(List<Guarantor> guarantors,
                               BigDecimal maxBudget,
                               BigDecimal totalOverride) {
        if (guarantors.isEmpty()) return new Points(0, "Nessun garante → 0 pt");

        // Reddito effettivo verificato (override supervisore o somma per-garante)
        BigDecimal effectiveTotal = resolveGuarantorTotal(guarantors, totalOverride);
        boolean hasVerifiedIncome = totalOverride != null
                || guarantors.stream().anyMatch(Guarantor::isIncomeVerified);

        if (!hasVerifiedIncome || effectiveTotal.doubleValue() == 0) {
            return new Points(2, "Garante presente (reddito non verificato) → 2 pt");
        }

        // Se il budget non è disponibile non possiamo calcolare la qualità
        if (maxBudget == null || maxBudget.doubleValue() == 0) {
            return new Points(7, String.format(
                    "Garante verificato €%.0f/mese (budget non dichiarato) → 7 pt",
                    effectiveTotal.doubleValue()));
        }

        double ratio = effectiveTotal.doubleValue() / maxBudget.doubleValue();
        String ovNote = totalOverride != null ? " [totale verificato]" : "";

        if (ratio >= GUARANTOR_QUALITY_HIGH)
            return new Points(10, String.format(
                    "Qualità garante ALTA%s: €%.0f / €%.0f (ratio %.1f×) → 10 pt",
                    ovNote, effectiveTotal.doubleValue(), maxBudget.doubleValue(), ratio));
        if (ratio >= GUARANTOR_QUALITY_MEDIUM)
            return new Points(7, String.format(
                    "Qualità garante MEDIA%s: €%.0f / €%.0f (ratio %.1f×) → 7 pt",
                    ovNote, effectiveTotal.doubleValue(), maxBudget.doubleValue(), ratio));
        if (ratio >= GUARANTOR_QUALITY_LOW)
            return new Points(5, String.format(
                    "Qualità garante BASSA%s: €%.0f / €%.0f (ratio %.1f×) → 5 pt",
                    ovNote, effectiveTotal.doubleValue(), maxBudget.doubleValue(), ratio));
        return new Points(3, String.format(
                "Qualità garante INSUFFICIENTE%s: €%.0f / €%.0f (ratio %.1f×) → 3 pt",
                ovNote, effectiveTotal.doubleValue(), maxBudget.doubleValue(), ratio));
    }

    private int calcFactorDMultiple(List<Guarantor> guarantors,
                                    BigDecimal maxBudget,
                                    BigDecimal totalOverride) {
        return calcFactorD(guarantors, maxBudget, totalOverride).points();
    }

    /** Calcola il reddito totale effettivo dei garanti (override o somma per-garante). */
    private BigDecimal resolveGuarantorTotal(List<Guarantor> guarantors, BigDecimal override) {
        if (override != null) return override;
        return guarantors.stream()
                .filter(Guarantor::isIncomeVerified)
                .map(g -> g.getVerifiedMonthlyIncome() != null
                        ? g.getVerifiedMonthlyIncome() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ── Family score (per STUDENT) ────────────────────────────────────────────
    // Valuta il singolo garante come "income provider" indipendente.
    // Factor D usa la qualità del singolo garante (income/budget).

    private int calcFamilyScore(Guarantor g, ScoringTemplate tpl, BigDecimal maxBudget) {
        if (g == null) return 0;
        int a = calcFactorA(g.getEmploymentType(), g.getContractType(), g.getEmploymentEndDate()).points();
        int b = calcFactorB(g.getEmploymentStartDate()).points();
        int c = g.isIncomeVerified() ? 20 : (g.getDeclaredMonthlyIncome() != null ? 5 : 0);
        // Factor D per garante singolo: qualità in base al reddito/budget
        BigDecimal singleIncome = g.isIncomeVerified() && g.getVerifiedMonthlyIncome() != null
                ? g.getVerifiedMonthlyIncome()
                : (g.getDeclaredMonthlyIncome() != null ? g.getDeclaredMonthlyIncome() : null);
        int d;
        if (singleIncome == null || singleIncome.doubleValue() == 0) {
            d = 0;
        } else if (!g.isIncomeVerified()) {
            d = 2; // solo dichiarato
        } else if (maxBudget == null || maxBudget.doubleValue() == 0) {
            d = 7; // verificato, budget ignoto
        } else {
            double ratio = singleIncome.doubleValue() / maxBudget.doubleValue();
            d = ratio >= GUARANTOR_QUALITY_HIGH   ? 10
              : ratio >= GUARANTOR_QUALITY_MEDIUM  ?  7
              : ratio >= GUARANTOR_QUALITY_LOW     ?  5 : 3;
        }
        return Math.min(a + b + c + d, 100);
    }

    private String scoreToLevel(int score, ScoringTemplate tpl) {
        if (score >= tpl.getStabilityHighThreshold())   return "HIGH";
        if (score >= tpl.getStabilityMediumThreshold()) return "MEDIUM";
        return "LOW";
    }

    private IncomeBreakdown emptyIncomeBreakdown(String level, String reason) {
        return new IncomeBreakdown(null, null, 0, reason, 0, "", 0, "", 0, "",
                0, level, false, null, null, null, null, null, null, null, null, null);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DOCUMENT RELIABILITY — punteggio pesato per tipo
    // ═════════════════════════════════════════════════════════════════════════

    private String documentReliabilityLevel(List<Document> docs, UUID pid,
                                            List<Guarantor> guarantors, ScoringTemplate tpl) {
        return buildDocBreakdown(docs, pid, guarantors, tpl).level();
    }

    private DocBreakdown buildDocBreakdown(List<Document> docs, UUID pid,
                                           List<Guarantor> guarantors, ScoringTemplate tpl) {
        Set<String> approved = pid != null ? getSupervisorApprovedDocFields(pid) : Set.of();

        // Conteggio per tipo dei documenti del tenant (non garante)
        Map<DocumentType, Long> countByType = docs == null ? Map.of() : docs.stream()
                .filter(d -> d.getGuarantorId() == null)
                .collect(Collectors.groupingBy(Document::getType, Collectors.counting()));

        List<DocLine> lines = new ArrayList<>();
        int total = 0;

        // IDENTITY — aggregate old IDENTITY type and new IDENTITY_FRONT / IDENTITY_BACK
        int identityCount = countByType.getOrDefault(DocumentType.IDENTITY,       0L).intValue()
                          + countByType.getOrDefault(DocumentType.IDENTITY_FRONT, 0L).intValue()
                          + countByType.getOrDefault(DocumentType.IDENTITY_BACK,  0L).intValue();
        boolean identityApproved = approved.contains("doc.IDENTITY");
        int identityPts = identityApproved ? tpl.getDocWeightIdentity() : 0;
        lines.add(new DocLine("IDENTITY", identityCount, identityApproved,
                identityPts, tpl.getDocWeightIdentity(), false));
        total += identityPts;

        // PAYSLIP (con bonus triplo)
        int payslipCount = countByType.getOrDefault(DocumentType.PAYSLIP, 0L).intValue();
        boolean payslipApproved = approved.contains("doc.PAYSLIP");
        int payslipPts = payslipApproved ? tpl.getDocWeightPayslip() : 0;
        lines.add(new DocLine("PAYSLIP", payslipCount, payslipApproved,
                payslipPts, tpl.getDocWeightPayslip(), false));
        total += payslipPts;
        if (payslipApproved && payslipCount >= 3) {
            int bonus = tpl.getDocWeightPayslipTripleBonus();
            lines.add(new DocLine("PAYSLIP_TRIPLE_BONUS", payslipCount, true, bonus, bonus, true));
            total += bonus;
        }

        // TAX_RETURN
        total += addDocLine(lines, "TAX_RETURN", countByType, approved,
                tpl.getDocWeightTaxReturn(), 0, false);

        // EMPLOYMENT_CONTRACT
        total += addDocLine(lines, "EMPLOYMENT_CONTRACT", countByType, approved,
                tpl.getDocWeightEmploymentContract(), 0, false);

        // BANK_STATEMENT
        total += addDocLine(lines, "BANK_STATEMENT", countByType, approved,
                tpl.getDocWeightBankStatement(), 0, false);

        // LANDLORD_REFERENCE
        total += addDocLine(lines, "LANDLORD_REFERENCE", countByType, approved,
                tpl.getDocWeightLandlordReference(), 0, false);

        // GUARANTOR_DOCUMENT (documenti propri del garante)
        total += addDocLine(lines, "GUARANTOR_DOCUMENT", countByType, approved,
                tpl.getDocWeightGuarantorDocument(), 0, false);

        total = Math.min(total, 100);

        String level;
        if (total >= tpl.getDocReliabilityHighThreshold())   level = "HIGH";
        else if (total >= tpl.getDocReliabilityMediumThreshold()) level = "MEDIUM";
        else level = "LOW";

        String explanation = String.format(
                "Punteggio documenti: %d/100 · Soglie: ≥%d HIGH · ≥%d MEDIUM · <%d LOW",
                total, tpl.getDocReliabilityHighThreshold(),
                tpl.getDocReliabilityMediumThreshold(),
                tpl.getDocReliabilityMediumThreshold());

        return new DocBreakdown(lines, total, level, explanation);
    }

    private int addDocLine(List<DocLine> lines, String typeName,
                           Map<DocumentType, Long> countByType, Set<String> approved,
                           int weight, int unused, boolean isBonus) {
        DocumentType dt;
        try { dt = DocumentType.valueOf(typeName); } catch (Exception e) { return 0; }
        int count    = countByType.getOrDefault(dt, 0L).intValue();
        boolean app  = approved.contains("doc." + typeName);
        int pts      = app ? weight : 0;
        lines.add(new DocLine(typeName, count, app, pts, weight, isBonus));
        return pts;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SUGGERIMENTI CON IMPATTO STIMATO
    // ═════════════════════════════════════════════════════════════════════════

    private List<ScoreSuggestion> buildSuggestions(RentBreakdown rent,
                                                    IncomeBreakdown income,
                                                    DocBreakdown docs,
                                                    ScoringTemplate tpl) {
        List<ScoreSuggestion> suggestions = new ArrayList<>();

        // ── rent_sustainability ──────────────────────────────────────────────
        if ("LOW".equals(rent.level()) || "MEDIUM".equals(rent.level())) {
            if (rent.verifiedIncome() == null && rent.declaredIncome() != null) {
                suggestions.add(new ScoreSuggestion(
                        "rent_sustainability",
                        "Verifica e correggi il reddito mensile del tenant (imposta verified_value su monthlyIncome)",
                        "Potrebbe migliorare a MEDIUM o HIGH se il reddito reale è più alto",
                        null, null
                ));
            }
            if (rent.guarantorCredit() != null && rent.guarantorCredit().doubleValue() == 0) {
                suggestions.add(new ScoreSuggestion(
                        "rent_sustainability",
                        "Aggiungi un garante con reddito verificato per aumentare il reddito effettivo",
                        "Con garante al " + tpl.getGuarantorIncomeCreditPct() + "% di credito il reddito effettivo aumenta",
                        null, null
                ));
            }
        }

        // ── income_stability ─────────────────────────────────────────────────
        int currentScore = income.combinedScore() != null ? income.combinedScore() : income.totalScore();
        if (!"HIGH".equals(income.level())) {
            // C: suggerisci verifica reddito
            if (income.factorC() < 20) {
                int gain = 20 - income.factorC();
                suggestions.add(new ScoreSuggestion(
                        "income_stability",
                        "Verifica il reddito del tenant tramite documenti (imposta verified_value) → +" + gain + " pt su Fattore C",
                        scoreToLevel(Math.min(currentScore + gain, 100), tpl),
                        gain, null
                ));
            }
            // D: suggerisci aggiunta garante
            if (income.factorD() < 10) {
                int gain = 10 - income.factorD();
                suggestions.add(new ScoreSuggestion(
                        "income_stability",
                        "Aggiungi o verifica un garante → +" + gain + " pt su Fattore D",
                        scoreToLevel(Math.min(currentScore + gain, 100), tpl),
                        gain, null
                ));
            }
            // Per studenti: aggiungi garante familiare
            if (Boolean.TRUE.equals(income.isStudent()) && income.familyScore() == null) {
                suggestions.add(new ScoreSuggestion(
                        "income_stability",
                        "Aggiungi dati del garante familiare: anche con stipendio base stima combined ≥ 44 (MEDIUM)",
                        "MEDIUM",
                        null, null
                ));
            }
        }

        // ── document_reliability ─────────────────────────────────────────────
        if (!"HIGH".equals(docs.level())) {
            docs.lines().stream()
                    .filter(l -> !l.approved() && l.maxPoints() > 0 && !l.isBonus())
                    .sorted((a, b) -> b.maxPoints() - a.maxPoints())
                    .limit(3)
                    .forEach(l -> suggestions.add(new ScoreSuggestion(
                            "document_reliability",
                            "Approva il documento → +" + l.maxPoints() + " pt",
                            scoreToLevel(Math.min(docs.totalScore() + l.maxPoints(), 100), tpl),
                            l.maxPoints(),
                            l.type()
                    )));
            // Bonus 3 buste paga
            boolean payslipApproved = docs.lines().stream().anyMatch(l -> "PAYSLIP".equals(l.type()) && l.approved());
            boolean bonusPresent    = docs.lines().stream().anyMatch(l -> "PAYSLIP_TRIPLE_BONUS".equals(l.type()));
            if (payslipApproved && !bonusPresent) {
                int bonusPts = tpl.getDocWeightPayslipTripleBonus();
                suggestions.add(new ScoreSuggestion(
                        "document_reliability",
                        "Richiedi 3 buste paga consecutive → bonus +" + bonusPts + " pt",
                        scoreToLevel(Math.min(docs.totalScore() + bonusPts, 100), tpl),
                        bonusPts, "PAYSLIP_TRIPLE_BONUS"
                ));
            }
        }

        return suggestions;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EXPLANATION BUILDERS (per ScoreDetailDto)
    // ═════════════════════════════════════════════════════════════════════════

    private String rentExplanation(TenantProfile p, List<Guarantor> gs, ScoringTemplate tpl) {
        return buildRentBreakdown(p, gs, tpl).explanation();
    }

    private String incomeExplanation(TenantProfile p, List<Guarantor> gs,
                                     ScoringTemplate tpl, UUID pid) {
        IncomeBreakdown b = buildIncomeBreakdown(p, gs, tpl, pid);
        if (b.combinedScore() != null) {
            return String.format("STUDENT: own=%d · family=%d · combined=%d → %s",
                    b.totalScore(), b.familyScore(), b.combinedScore(), b.level());
        }
        return String.format("A=%d B=%d C=%d D=%d = %d → %s",
                b.factorA(), b.factorB(), b.factorC(), b.factorD(), b.totalScore(), b.level());
    }

    private String docExplanation(List<Document> docs, UUID pid,
                                  List<Guarantor> gs, ScoringTemplate tpl) {
        return buildDocBreakdown(docs, pid, gs, tpl).explanation();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    private ScoringTemplate loadTemplate(TenantProfile profile) {
        if (profile == null || profile.getScoringTemplateId() == null)
            return defaultTemplate();
        return scoringTemplateRepo.findById(profile.getScoringTemplateId())
                .orElseGet(this::defaultTemplate);
    }

    private ScoringTemplate loadTemplateById(UUID tenantProfileId) {
        // Usato da metodi pubblici che ricevono solo l'ID
        // Senza TenantProfile: usa il default
        return defaultTemplate();
    }

    private ScoringTemplate defaultTemplate() {
        return scoringTemplateRepo.findByIsDefaultTrue()
                .orElseGet(ScoringTemplate::new);
    }
}
