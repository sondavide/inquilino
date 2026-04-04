package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tenant_interest_areas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantInterestArea {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** POLYGON | CITY_BOUNDARY | ANYWHERE */
    @Column(name = "area_type", nullable = false)
    private String areaType;

    @Column(name = "city_name")
    private String cityName;

    /**
     * GeoJSON geometry object (e.g. {"type":"Polygon","coordinates":[...]}).
     * Null for ANYWHERE areas.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "area_geojson", columnDefinition = "jsonb")
    private Map<String, Object> areaGeojson;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();
}
