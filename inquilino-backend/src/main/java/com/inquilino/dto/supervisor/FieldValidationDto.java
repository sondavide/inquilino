package com.inquilino.dto.supervisor;

import com.inquilino.entity.FieldValidation;

import java.time.LocalDateTime;
import java.util.UUID;

public record FieldValidationDto(
        UUID          id,
        String        fieldName,
        String        status,
        String        note,
        /** Valore verificato dal supervisore (es. reddito corretto) */
        String        verifiedValue,
        UUID          supervisorId,
        LocalDateTime validatedAt,
        LocalDateTime correctedAt
) {
    public static FieldValidationDto from(FieldValidation fv) {
        return new FieldValidationDto(
                fv.getId(),
                fv.getFieldName(),
                fv.getStatus().name(),
                fv.getNote(),
                fv.getVerifiedValue(),
                fv.getSupervisorId(),
                fv.getValidatedAt(),
                fv.getCorrectedAt()
        );
    }
}
