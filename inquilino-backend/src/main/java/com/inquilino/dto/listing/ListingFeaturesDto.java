package com.inquilino.dto.listing;

import java.math.BigDecimal;
import java.util.Map;

public record ListingFeaturesDto(
        BigDecimal surfaceSqm,
        BigDecimal commercialSurfaceSqm,
        Integer roomsCount,
        Integer bedroomsCount,
        Integer bathroomsCount,
        Integer floorNumber,
        Integer totalBuildingFloors,
        boolean elevator,
        int parkingSpacesCount,
        boolean garageIncluded,
        int balconiesCount,
        int terracesCount,
        int cellarsCount,
        // Room-specific
        String roomType,
        BigDecimal roomSurfaceSqm,
        Boolean roomFurnished,
        Boolean privateBathroom,
        Boolean sharedBathroom,
        Boolean sharedKitchen,
        Integer roommatesCount,
        boolean studentsOnly,
        // Amenities (key=amenity name, value=true/false)
        Map<String, Boolean> amenities
) {}
