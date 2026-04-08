package com.inquilino.dto.listing;

import java.time.LocalDate;

public record ListingAvailabilityDto(
        String conditionStatus,
        String furnishedStatus,
        String kitchenStatus,
        String heatingType,
        String coolingType,
        String availabilityStatus,
        LocalDate availableFrom,
        LocalDate availableTo,
        Integer minimumContractDurationMonths,
        Integer maximumContractDurationMonths,
        Integer minimumStayDays,
        Integer maximumStayDays,
        Integer maxOccupants,
        boolean petsAllowed,
        boolean smokingAllowed,
        boolean childrenAllowed,
        boolean sublettingAllowed,
        boolean residenceAllowed,
        boolean studentsAllowed,
        boolean workersAllowed,
        boolean shortStayAllowed,
        String notesForTenants
) {}
