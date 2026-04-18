package com.inquilino.entity;

import jakarta.persistence.*;
import lombok.*;
import org.locationtech.jts.geom.Geometry;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "agency_areas")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AgencyAreaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "agency_user_id", nullable = false)
    private UUID agencyUserId;

    @Column(name = "area_type", nullable = false, length = 20)
    private String areaType;

    @Column(name = "osm_id", length = 50)
    private String osmId;

    @Column(nullable = false)
    private String name;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "area_geometry", columnDefinition = "geometry(Geometry,4326)")
    private Geometry areaGeometry;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
