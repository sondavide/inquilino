package com.inquilino.dto.supervisor;

import com.inquilino.entity.TenantProfile;

import java.math.BigDecimal;
import java.util.UUID;

public record SupervisorProfileDetailDto(
        UUID       profileId,
        UUID       userId,
        String     email,
        String     phone,
        String     fullName,
        String     birthDate,
        String     birthPlace,
        String     residence,
        String     fiscalCode,
        String     employmentType,
        BigDecimal monthlyIncome,
        String     contractType,
        String     employmentStartDate,
        String     employmentEndDate,
        boolean    hasGuarantor,
        BigDecimal guarantorIncome,
        BigDecimal maxBudget,
        String     moveInDate,
        Integer    occupants,
        boolean    hasPets,
        boolean    smoker,
        String     verificationStatus,
        int        profileCompletion,
        UUID       assignedSupervisorId,
        UUID       scoringTemplateId,
        ScoreDetailDto score
) {
    public static SupervisorProfileDetailDto from(TenantProfile p, ScoreDetailDto score) {
        var u = p.getUser();
        return new SupervisorProfileDetailDto(
                p.getId(),
                u.getId(),
                u.getEmail(),
                u.getPhone()                  != null ? u.getPhone() : "",
                p.getFullName()               != null ? p.getFullName() : "",
                p.getBirthDate()              != null ? p.getBirthDate().toString() : "",
                p.getBirthPlace()             != null ? p.getBirthPlace() : "",
                p.getResidence()              != null ? p.getResidence() : "",
                p.getFiscalCode()             != null ? p.getFiscalCode() : "",
                p.getEmploymentType()         != null ? p.getEmploymentType().name() : "",
                p.getMonthlyIncome(),
                p.getContractType()           != null ? p.getContractType().name() : "",
                p.getEmploymentStartDate()    != null ? p.getEmploymentStartDate().toString() : "",
                p.getEmploymentEndDate()      != null ? p.getEmploymentEndDate().toString() : "",
                p.isHasGuarantor(),
                p.getGuarantorIncome(),
                p.getMaxBudget(),
                p.getMoveInDate()             != null ? p.getMoveInDate().toString() : "",
                p.getOccupants(),
                p.isHasPets(),
                p.isSmoker(),
                p.getVerificationStatus().name(),
                p.getProfileCompletion(),
                p.getAssignedSupervisorId(),
                p.getScoringTemplateId(),
                score
        );
    }
}
