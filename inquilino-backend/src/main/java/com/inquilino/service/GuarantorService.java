package com.inquilino.service;

import com.inquilino.dto.guarantor.GuarantorRequest;
import com.inquilino.entity.Guarantor;
import com.inquilino.enums.ContractType;
import com.inquilino.enums.EmploymentType;
import com.inquilino.repository.GuarantorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GuarantorService {

    private final GuarantorRepository guarantorRepo;

    public List<Guarantor> list(UUID tenantProfileId) {
        return guarantorRepo.findByTenantProfileIdOrderByCreatedAtAsc(tenantProfileId);
    }

    public Guarantor create(UUID tenantProfileId, GuarantorRequest req, UUID enteredBy, String role) {
        Guarantor g = Guarantor.builder()
                .tenantProfileId(tenantProfileId)
                .roleLabel(req.roleLabel())
                .fullName(req.fullName())
                .fiscalCode(req.fiscalCode())
                .employmentType(parseEnum(EmploymentType.class, req.employmentType()))
                .contractType(parseEnum(ContractType.class, req.contractType()))
                .employmentStartDate(parseDate(req.employmentStartDate()))
                .employmentEndDate(parseDate(req.employmentEndDate()))
                .declaredMonthlyIncome(req.declaredMonthlyIncome())
                .incomeVerified(false)
                .enteredBy(enteredBy)
                .enteredByRole(role)
                .build();
        return guarantorRepo.save(g);
    }

    public Guarantor update(UUID guarantorId, UUID tenantProfileId, GuarantorRequest req) {
        Guarantor g = find(guarantorId, tenantProfileId);
        g.setRoleLabel(req.roleLabel());
        g.setFullName(req.fullName());
        g.setFiscalCode(req.fiscalCode());
        g.setEmploymentType(parseEnum(EmploymentType.class, req.employmentType()));
        g.setContractType(parseEnum(ContractType.class, req.contractType()));
        g.setEmploymentStartDate(parseDate(req.employmentStartDate()));
        g.setEmploymentEndDate(parseDate(req.employmentEndDate()));
        g.setDeclaredMonthlyIncome(req.declaredMonthlyIncome());
        return guarantorRepo.save(g);
    }

    /** Supervisore verifica il reddito del garante */
    public Guarantor verifyIncome(UUID guarantorId, UUID tenantProfileId, BigDecimal verifiedIncome) {
        Guarantor g = find(guarantorId, tenantProfileId);
        g.setVerifiedMonthlyIncome(verifiedIncome);
        g.setIncomeVerified(verifiedIncome != null);
        return guarantorRepo.save(g);
    }

    public void delete(UUID guarantorId, UUID tenantProfileId) {
        Guarantor g = find(guarantorId, tenantProfileId);
        guarantorRepo.delete(g);
    }

    private Guarantor find(UUID id, UUID tenantProfileId) {
        Guarantor g = guarantorRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Guarantor not found"));
        if (!g.getTenantProfileId().equals(tenantProfileId))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Guarantor does not belong to this profile");
        return g;
    }

    private <E extends Enum<E>> E parseEnum(Class<E> cls, String value) {
        if (value == null || value.isBlank()) return null;
        try { return Enum.valueOf(cls, value.toUpperCase()); }
        catch (Exception e) { return null; }
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) return null;
        try { return LocalDate.parse(value); }
        catch (Exception e) { return null; }
    }
}
