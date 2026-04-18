package com.inquilino.repository;

import com.inquilino.entity.AgencyAreaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AgencyAreaRepository extends JpaRepository<AgencyAreaEntity, UUID> {

    void deleteByAgencyUserId(UUID agencyUserId);

    List<AgencyAreaEntity> findByAgencyUserId(UUID agencyUserId);

    /**
     * Restituisce gli agency_user_id delle agenzie la cui area di pertinenza
     * interseca la geometria fornita (es. area di interesse di un tenant).
     */
    @Query(value = """
            SELECT DISTINCT a.agency_user_id
            FROM agency_areas a
            WHERE ST_Intersects(a.area_geometry, ST_GeomFromText(:wkt, 4326))
            """, nativeQuery = true)
    List<UUID> findAgencyUserIdsByGeometryIntersection(@Param("wkt") String wkt);
}
