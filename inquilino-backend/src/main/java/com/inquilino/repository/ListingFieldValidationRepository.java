package com.inquilino.repository;

import com.inquilino.entity.ListingFieldValidation;
import com.inquilino.enums.FieldValidationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ListingFieldValidationRepository extends JpaRepository<ListingFieldValidation, UUID> {

    List<ListingFieldValidation> findByListingId(UUID listingId);

    Optional<ListingFieldValidation> findByListingIdAndFieldName(UUID listingId, String fieldName);

    List<ListingFieldValidation> findByListingIdAndStatus(UUID listingId, FieldValidationStatus status);

    boolean existsByListingIdAndFieldNameAndStatus(UUID listingId, String fieldName, FieldValidationStatus status);
}
