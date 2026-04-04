package com.inquilino.repository;

import com.inquilino.entity.TenantInterestArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface InterestAreaRepository extends JpaRepository<TenantInterestArea, UUID> {

    List<TenantInterestArea> findByUserId(UUID userId);

    void deleteByUserId(UUID userId);

    /**
     * Returns all interest-area records that spatially include the given point.
     *
     * An ANYWHERE area (area_geometry IS NULL) always matches.
     * For POLYGON and CITY_BOUNDARY areas the generated PostGIS geometry column
     * is tested with ST_Contains against the apartment's coordinates.
     *
     * Usage: given an apartment at (lat, lng), get all matching areas — then
     * extract the distinct user_ids to build the candidate tenant list.
     *
     * @param lat latitude  (WGS-84)
     * @param lng longitude (WGS-84)
     */
    @Query(value = """
            SELECT *
            FROM   tenant_interest_areas
            WHERE  area_type = 'ANYWHERE'
               OR  ST_Contains(
                       area_geometry,
                       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                   )
            """, nativeQuery = true)
    List<TenantInterestArea> findAreasContainingPoint(@Param("lat") double lat,
                                                      @Param("lng") double lng);

    /**
     * Convenience projection: returns only the distinct user_ids of tenants
     * whose area of interest covers the given point.
     * Ready to be joined with the users/profiles table by callers.
     */
    @Query(value = """
            SELECT DISTINCT user_id
            FROM   tenant_interest_areas
            WHERE  area_type = 'ANYWHERE'
               OR  ST_Contains(
                       area_geometry,
                       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)
                   )
            """, nativeQuery = true)
    List<UUID> findUserIdsContainingPoint(@Param("lat") double lat,
                                          @Param("lng") double lng);
}
