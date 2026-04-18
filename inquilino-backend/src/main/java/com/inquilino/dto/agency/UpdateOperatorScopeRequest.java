package com.inquilino.dto.agency;

import java.util.List;
import java.util.UUID;

public record UpdateOperatorScopeRequest(
        /** null = accesso completo a tutti gli annunci */
        List<UUID> listingScope
) {}
