package com.inquilino.dto.listing;

import com.inquilino.entity.ListingFieldValidation;

import java.time.LocalDateTime;
import java.util.UUID;

public record ListingFieldValidationDto(
        UUID id,
        UUID listingId,
        String fieldName,
        String status,
        String note,
        UUID supervisorId,
        LocalDateTime validatedAt,
        LocalDateTime correctedAt
) {
    public static ListingFieldValidationDto from(ListingFieldValidation fv) {
        return new ListingFieldValidationDto(
                fv.getId(), fv.getListingId(), fv.getFieldName(),
                fv.getStatus().name(), fv.getNote(), fv.getSupervisorId(),
                fv.getValidatedAt(), fv.getCorrectedAt()
        );
    }
}
