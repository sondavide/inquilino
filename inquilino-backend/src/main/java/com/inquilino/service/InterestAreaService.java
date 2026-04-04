package com.inquilino.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inquilino.entity.TenantInterestArea;
import com.inquilino.repository.InterestAreaRepository;
import org.locationtech.jts.geom.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Spatial matching service: given an apartment's coordinates, returns the IDs
 * of tenants whose area of interest includes that point.
 *
 * Strategy:
 *  1. Try the PostGIS native query (fast, server-side GIST index).
 *  2. If PostGIS is not installed the query throws — fall back to loading all
 *     areas and running JTS point-in-polygon in Java.
 *
 * Once PostGIS is installed and migration V5 ran successfully, path 1 is
 * always taken and path 2 is never reached.
 */
@Service
public class InterestAreaService {

    private static final Logger log = LoggerFactory.getLogger(InterestAreaService.class);

    private final InterestAreaRepository repo;
    private final ObjectMapper           mapper;
    private final GeometryFactory        gf = new GeometryFactory(new PrecisionModel(), 4326);

    public InterestAreaService(InterestAreaRepository repo, ObjectMapper mapper) {
        this.repo   = repo;
        this.mapper = mapper;
    }

    /**
     * Returns user IDs of tenants interested in an apartment at (lat, lng).
     */
    public List<UUID> findTenantsForApartment(double lat, double lng) {
        try {
            return repo.findUserIdsContainingPoint(lat, lng);
        } catch (DataAccessException ex) {
            log.warn("PostGIS query failed (extension probably not installed), "
                    + "falling back to Java JTS: {}", ex.getMessage());
            return javaFallback(lat, lng);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    private List<UUID> javaFallback(double lat, double lng) {
        Point point = gf.createPoint(new Coordinate(lng, lat)); // GeoJSON order: [lng, lat]

        return repo.findAll().stream()
                .filter(area -> matchesPoint(area, point))
                .map(TenantInterestArea::getUserId)
                .distinct()
                .toList();
    }

    private boolean matchesPoint(TenantInterestArea area, Point point) {
        if ("ANYWHERE".equals(area.getAreaType()))  return true;
        if (area.getAreaGeojson() == null)           return false;
        try {
            Geometry geom = parseGeoJson(area.getAreaGeojson());
            return geom != null && geom.contains(point);
        } catch (Exception ex) {
            log.warn("Could not parse area GeoJSON for userId={}: {}",
                    area.getUserId(), ex.getMessage());
            return false;
        }
    }

    /**
     * Parses a GeoJSON geometry stored as a Jackson-deserialized Map into a JTS
     * Geometry. Supports Polygon and MultiPolygon (Nominatim city boundaries are
     * often MultiPolygon).
     */
    @SuppressWarnings("unchecked")
    private Geometry parseGeoJson(Map<String, Object> raw) {
        if (raw == null) return null;
        String type = (String) raw.get("type");
        Object coordinates = raw.get("coordinates");

        return switch (type) {
            case "Polygon" ->
                buildPolygon((List<List<List<Number>>>) coordinates);
            case "MultiPolygon" -> {
                List<List<List<List<Number>>>> polys = (List<List<List<List<Number>>>>) coordinates;
                Geometry[] geoms = polys.stream()
                        .map(this::buildPolygon)
                        .filter(Objects::nonNull)
                        .toArray(Geometry[]::new);
                yield geoms.length == 0 ? null : gf.createGeometryCollection(geoms).union();
            }
            default -> null;
        };
    }

    private Polygon buildPolygon(List<List<List<Number>>> rings) {
        if (rings == null || rings.isEmpty()) return null;
        LinearRing shell = buildRing(rings.get(0));
        LinearRing[] holes = rings.stream()
                .skip(1)
                .map(this::buildRing)
                .toArray(LinearRing[]::new);
        return gf.createPolygon(shell, holes);
    }

    private LinearRing buildRing(List<List<Number>> coords) {
        Coordinate[] cs = coords.stream()
                .map(c -> new Coordinate(c.get(0).doubleValue(), c.get(1).doubleValue()))
                .toArray(Coordinate[]::new);
        return gf.createLinearRing(cs);
    }
}
