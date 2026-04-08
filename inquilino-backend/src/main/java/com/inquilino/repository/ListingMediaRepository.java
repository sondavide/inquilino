package com.inquilino.repository;

import com.inquilino.entity.ListingMedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ListingMediaRepository extends JpaRepository<ListingMedia, UUID> {
    List<ListingMedia> findByListingIdOrderBySortOrderAsc(UUID listingId);
    Optional<ListingMedia> findByIdAndListingId(UUID id, UUID listingId);
    void deleteByListingId(UUID listingId);
    int countByListingId(UUID listingId);
}
