package com.inquilino.service;

import com.inquilino.dto.admin.ScoringTemplateDto;
import com.inquilino.dto.admin.ScoringTemplateRequest;
import com.inquilino.entity.ScoringTemplate;
import com.inquilino.entity.TenantProfile;
import com.inquilino.enums.VerificationStatus;
import com.inquilino.repository.ScoringTemplateRepository;
import com.inquilino.repository.TenantProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ScoringTemplateService {

    private final ScoringTemplateRepository templateRepo;
    private final TenantProfileRepository   profileRepo;
    private final MatchingService           matchingService;
    private final ScoringTemplateBulkJob    bulkJob;

    // ─── Lista ───────────────────────────────────────────────────────────────

    public List<ScoringTemplateDto> listAll() {
        return templateRepo.findAll().stream()
                .map(t -> ScoringTemplateDto.from(t, profileRepo.countByScoringTemplateId(t.getId())))
                .toList();
    }

    public ScoringTemplateDto getById(UUID id) {
        ScoringTemplate t = load(id);
        return ScoringTemplateDto.from(t, profileRepo.countByScoringTemplateId(id));
    }

    // ─── Crea ────────────────────────────────────────────────────────────────

    @Transactional
    public ScoringTemplateDto create(ScoringTemplateRequest req, UUID superadminId) {
        validateWeightsNotAllZero(req);
        if (req.isDefault()) clearOtherDefaults();

        ScoringTemplate tpl = ScoringTemplate.builder()
                .name(req.name())
                .description(req.description())
                .weightIdentity(req.weightIdentity())
                .weightIncome(req.weightIncome())
                .weightStability(req.weightStability())
                .weightDocuments(req.weightDocuments())
                .weightGuarantor(req.weightGuarantor())
                .isDefault(req.isDefault())
                .createdBy(superadminId)
                .build();

        return ScoringTemplateDto.from(templateRepo.save(tpl), 0);
    }

    // ─── Aggiorna ─────────────────────────────────────────────────────────────

    /**
     * Aggiorna il template e avvia il ricalcolo in background per tutti i profili
     * VERIFIED collegati. Il superadmin riceverà una notifica al termine.
     */
    @Transactional
    public ScoringTemplateDto update(UUID id, ScoringTemplateRequest req, UUID superadminId) {
        validateWeightsNotAllZero(req);
        ScoringTemplate tpl = load(id);

        if (req.isDefault() && !tpl.isDefault()) clearOtherDefaults();

        tpl.setName(req.name());
        tpl.setDescription(req.description());
        tpl.setWeightIdentity(req.weightIdentity());
        tpl.setWeightIncome(req.weightIncome());
        tpl.setWeightStability(req.weightStability());
        tpl.setWeightDocuments(req.weightDocuments());
        tpl.setWeightGuarantor(req.weightGuarantor());
        tpl.setDefault(req.isDefault());

        ScoringTemplate saved = templateRepo.save(tpl);

        // Ricalcolo in background (non blocca la risposta HTTP)
        bulkJob.recalculateForTemplate(id, saved.getName(), superadminId);

        return ScoringTemplateDto.from(saved, profileRepo.countByScoringTemplateId(id));
    }

    // ─── Elimina ──────────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID id) {
        ScoringTemplate tpl = load(id);
        if (tpl.isDefault()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Non è possibile eliminare il template di default");
        }
        long linked = profileRepo.countByScoringTemplateId(id);
        if (linked > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Il template è utilizzato da " + linked + " profili. Riassegna i profili prima di eliminarlo.");
        }
        templateRepo.deleteById(id);
    }

    // ─── Assegna template a un profilo (chiamato da SupervisorController) ────

    @Transactional
    public void assignToProfile(UUID tenantProfileId, UUID templateId, UUID supervisorId) {
        TenantProfile profile = profileRepo.findById(tenantProfileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profilo non trovato"));

        if (templateId != null) load(templateId); // verifica esistenza

        profile.setScoringTemplateId(templateId);
        profileRepo.save(profile);

        // Se il profilo è già VERIFIED, ricalcola subito i match
        if (profile.getVerificationStatus() == VerificationStatus.VERIFIED) {
            matchingService.computeMatchesForTenant(tenantProfileId);
        }
    }

    // ─── Helper privati ───────────────────────────────────────────────────────

    private ScoringTemplate load(UUID id) {
        return templateRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template non trovato"));
    }

    private void validateWeightsNotAllZero(ScoringTemplateRequest req) {
        int total = req.weightIdentity() + req.weightIncome() + req.weightStability()
                  + req.weightDocuments() + req.weightGuarantor();
        if (total == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Almeno un peso deve essere > 0");
        }
    }

    private void clearOtherDefaults() {
        templateRepo.findByIsDefaultTrue().ifPresent(existing -> {
            existing.setDefault(false);
            templateRepo.save(existing);
        });
    }
}
