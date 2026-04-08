package com.inquilino.dto.listing;

/**
 * Request unica per creare o aggiornare un annuncio (partial update: ogni sezione è opzionale).
 * Il wizard invia una sezione alla volta man mano che l'utente avanza negli step.
 */
public record SaveListingRequest(
        // Step 1 - Categoria
        String listingType,
        String propertyType,
        String publisherType,

        // Step 2-9 - sezioni dati
        String title,
        String description,
        String internalReference,
        String sourceLang,

        ListingLocationDto location,
        ListingPriceDto price,
        ListingFeaturesDto features,
        ListingAvailabilityDto availability,
        ListingEnergyDto energy,
        ListingPublisherDto publisher
) {}
