package com.inquilino.dto.agency;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record AgencyMembershipDto(
        UUID id,
        UUID operatorUserId,
        String operatorEmail,
        String operatorDisplayName,
        /** null = accesso completo */
        List<UUID> listingScope,
        LocalDateTime addedAt
) {}
