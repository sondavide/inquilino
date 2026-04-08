package com.inquilino.repository;

import com.inquilino.entity.ListingLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ListingLocationRepository extends JpaRepository<ListingLocation, UUID> {

    Optional<ListingLocation> findByListingId(UUID listingId);

    /**
     * Matching: returns the listing_ids of PUBLISHED listings whose display_point
     * is inside OR within 5 km of any of the tenant's interest areas.
     * Used when a tenant profile is verified to find candidate listings.
     */
    @Query(value = """
            SELECT DISTINCT ll.listing_id
            FROM listing_locations ll
            JOIN listings l ON l.id = ll.listing_id
            WHERE l.status = 'PUBLISHED'
              AND ll.display_point IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM tenant_interest_areas tia
                WHERE tia.user_id = :userId
                  AND (
                    tia.area_type = 'ANYWHERE'
                    OR ST_Contains(tia.area_geometry, ll.display_point)
                    OR ST_DWithin(
                        tia.area_geometry::geography,
                        ll.display_point::geography,
                        5000
                    )
                  )
              )
            """, nativeQuery = true)
    List<UUID> findPublishedListingIdsNearUserAreas(@Param("userId") UUID userId);
}
