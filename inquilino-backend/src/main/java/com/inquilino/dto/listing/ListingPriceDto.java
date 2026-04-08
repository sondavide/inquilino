package com.inquilino.dto.listing;

import java.math.BigDecimal;

public record ListingPriceDto(
        String currency,
        BigDecimal monthlyRent,
        BigDecimal weeklyRent,
        BigDecimal dailyRent,
        BigDecimal condominiumFees,
        boolean utilitiesIncluded,
        BigDecimal utilitiesEstimatedMonthly,
        Integer depositMonths,
        BigDecimal depositAmount,
        BigDecimal agencyFeeAmount,
        String agencyFeeNotes,
        String otherCostsNotes,
        String priceVisibility
) {}
