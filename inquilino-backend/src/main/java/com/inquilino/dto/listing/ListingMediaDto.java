package com.inquilino.dto.listing;

import java.time.LocalDateTime;
import java.util.UUID;

public record ListingMediaDto(
        UUID id,
        String mediaType,
        String fileUrl,
        int sortOrder,
        boolean isCover,
        LocalDateTime uploadedAt
) {}
