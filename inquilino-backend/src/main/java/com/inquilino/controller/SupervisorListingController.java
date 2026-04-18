package com.inquilino.controller;

import com.inquilino.dto.listing.*;
import com.inquilino.dto.supervisor.FieldActionRequest;
import com.inquilino.entity.Listing;
import com.inquilino.entity.ListingFieldValidation;
import com.inquilino.enums.ListingStatus;
import com.inquilino.enums.PublisherType;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.ListingService;
import com.inquilino.service.ListingValidationService;
import com.inquilino.service.MatchingService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/supervisor/listings")
@RequiredArgsConstructor
public class SupervisorListingController {

    private final ListingService           listingService;
    private final ListingValidationService validationService;
    private final MatchingService          matchingService;

    // ─── Coda annunci (IN_REVIEW + REJECTED con correzioni) ──────────────────

    @GetMapping
    public Page<ListingSummaryDto> getQueue(
            @RequestParam(defaultValue = "IN_REVIEW") String statuses,
            @RequestParam(required = false) String publisherType,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        List<ListingStatus> statusList = List.of(statuses.split(","))
                .stream()
                .map(s -> ListingStatus.valueOf(s.trim()))
                .toList();
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
        if (publisherType != null && !publisherType.isBlank()) {
            return listingService.getSupervisorQueuePaged(statusList, PublisherType.valueOf(publisherType.trim()), pageable);
        }
        return listingService.getSupervisorQueuePaged(statusList, pageable);
    }

    // ─── Dettaglio annuncio (apre revisione) ─────────────────────────────────

    @GetMapping("/{listingId}")
    public ListingResponse getListing(
            @PathVariable UUID listingId,
            @AuthenticationPrincipal UserPrincipal principal) {
        validationService.openListing(listingId, principal.getUserId());
        return listingService.getListingById(listingId);
    }

    // ─── Field validations ────────────────────────────────────────────────────

    @GetMapping("/{listingId}/validations")
    public List<ListingFieldValidationDto> getValidations(@PathVariable UUID listingId) {
        return validationService.getFieldValidations(listingId)
                .stream().map(ListingFieldValidationDto::from).toList();
    }

    // ─── Approva campo ────────────────────────────────────────────────────────

    @PostMapping("/{listingId}/fields/{fieldName}/approve")
    public ListingFieldValidationDto approveField(
            @PathVariable UUID listingId,
            @PathVariable String fieldName,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ListingFieldValidationDto.from(
                validationService.approveField(listingId, fieldName, principal.getUserId()));
    }

    // ─── Flagga campo ─────────────────────────────────────────────────────────

    @PostMapping("/{listingId}/fields/{fieldName}/flag")
    public ListingFieldValidationDto flagField(
            @PathVariable UUID listingId,
            @PathVariable String fieldName,
            @RequestBody FieldActionRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ListingFieldValidationDto.from(
                validationService.flagField(listingId, fieldName, req.note(), principal.getUserId()));
    }

    // ─── Revoca approvazione ──────────────────────────────────────────────────

    @DeleteMapping("/{listingId}/fields/{fieldName}/approve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetField(
            @PathVariable UUID listingId,
            @PathVariable String fieldName,
            @AuthenticationPrincipal UserPrincipal principal) {
        validationService.resetField(listingId, fieldName, principal.getUserId());
    }

    // ─── Completa validazione (pubblica o rigetta) ────────────────────────────

    @PostMapping("/{listingId}/complete-validation")
    public Map<String, String> completeValidation(
            @PathVariable UUID listingId,
            @AuthenticationPrincipal UserPrincipal principal) {
        Listing result = validationService.completeValidation(listingId, principal.getUserId());
        return Map.of("status", result.getStatus().name());
    }

    // ─── Ricalcola matching per un annuncio già pubblicato ───────────────────

    @PostMapping("/{listingId}/recompute-matches")
    public Map<String, String> recomputeMatches(@PathVariable UUID listingId) {
        listingService.getListingById(listingId); // verifica esistenza
        matchingService.computeMatchesForListing(listingId);
        return Map.of("result", "ok");
    }
}
