package com.inquilino.controller;

import com.inquilino.dto.map.InterestAreaRequest;
import com.inquilino.entity.TenantInterestArea;
import com.inquilino.repository.InterestAreaRepository;
import com.inquilino.repository.TenantProfileRepository;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.InterestAreaService;
import com.inquilino.service.MatchingService;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/onboarding/interest-area")
public class InterestAreaController {

    private final InterestAreaRepository  repo;
    private final InterestAreaService     service;
    private final TenantProfileRepository profileRepo;
    private final MatchingService         matchingService;

    public InterestAreaController(InterestAreaRepository repo, InterestAreaService service,
                                  TenantProfileRepository profileRepo, MatchingService matchingService) {
        this.repo           = repo;
        this.service        = service;
        this.profileRepo    = profileRepo;
        this.matchingService = matchingService;
    }

    /**
     * Save (replace) the tenant's interest areas.
     * Deletes all previous entries and inserts the new list atomically.
     * An empty list is accepted (tenant becomes unmatchable until they add areas again).
     */
    @Transactional
    @PostMapping
    public ResponseEntity<Void> saveAreas(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody List<InterestAreaRequest> areas) {

        UUID userId = principal.getUserId();
        repo.deleteByUserId(userId);

        for (InterestAreaRequest req : areas) {
            TenantInterestArea area = TenantInterestArea.builder()
                    .userId(userId)
                    .areaType(req.areaType())
                    .cityName(req.cityName())
                    .areaGeojson(req.areaGeojson())
                    .build();
            repo.save(area);
        }

        // Ricalcola matching con le nuove aree
        profileRepo.findByUserId(userId).ifPresent(p ->
            matchingService.computeMatchesForTenant(p.getId())
        );

        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<TenantInterestArea>> getAreas(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(repo.findByUserId(principal.getUserId()));
    }

    /** Delete the tenant's current interest area (called from profile page). */
    @Transactional
    @DeleteMapping
    public ResponseEntity<Void> deleteOwnArea(
            @AuthenticationPrincipal UserPrincipal principal) {
        UUID userId = principal.getUserId();
        repo.deleteByUserId(userId);
        profileRepo.findByUserId(userId).ifPresent(p ->
            matchingService.archiveMatchesForTenant(p.getId())
        );
        return ResponseEntity.noContent().build();
    }

    /**
     * Given an apartment position, returns the IDs of tenants whose interest
     * area covers that point.
     *
     * Intended for the future Scoring & Matching module: landlords (or internal
     * services) call this to get the candidate tenant list for a new listing.
     *
     * Example: GET /api/onboarding/interest-area/tenants-for-apartment?lat=40.65&lng=16.61
     */
    @GetMapping("/tenants-for-apartment")
    public ResponseEntity<List<UUID>> getTenantsForApartment(
            @RequestParam double lat,
            @RequestParam double lng) {
        return ResponseEntity.ok(service.findTenantsForApartment(lat, lng));
    }
}
