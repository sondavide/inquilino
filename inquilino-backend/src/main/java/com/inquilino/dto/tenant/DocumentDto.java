package com.inquilino.dto.tenant;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

public record DocumentDto(
        UUID id,
        String type,
        String fileUrl,
        LocalDateTime uploadedAt,
        boolean verified,
        Map<String, Object> extractedData
) {}
