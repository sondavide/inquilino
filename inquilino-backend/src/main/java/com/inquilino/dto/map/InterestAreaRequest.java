package com.inquilino.dto.map;

/**
 * Payload sent by the frontend when the user confirms an area in MapSelector.
 *
 * areaType:    POLYGON | CITY_BOUNDARY | ANYWHERE
 * cityName:    human-readable city name
 * areaGeojson: GeoJSON geometry object (Polygon / MultiPolygon / etc.) — null for ANYWHERE
 */
public record InterestAreaRequest(
        String areaType,
        String cityName,
        java.util.Map<String, Object> areaGeojson
) {}
