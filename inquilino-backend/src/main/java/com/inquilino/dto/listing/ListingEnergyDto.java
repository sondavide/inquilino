package com.inquilino.dto.listing;

import java.math.BigDecimal;

public record ListingEnergyDto(
        String energyClass,
        BigDecimal energyIndexEpgl,
        boolean energyCertificateAvailable,
        String energyCertificateFileUrl,
        String heatingEnergySource,
        boolean renewableEnergyPresent
) {}
