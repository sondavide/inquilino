package com.inquilino.dto.tenant;

import java.util.Map;
import java.util.UUID;

public record InterestAreaDto(
        UUID id,
        String areaType,
        String cityName,
        Map<String, Object> areaGeojson
) {}
