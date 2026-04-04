package com.inquilino.controller;

import com.inquilino.dto.map.InterestAreaRequest;
import com.inquilino.entity.TenantInterestArea;
import com.inquilino.repository.InterestAreaRepository;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.InterestAreaService;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/onboarding/interest-area")
public class InterestAreaController {

    private final InterestAreaRepository repo;
    private final InterestAreaService    service;

    public InterestAreaController(InterestAreaRepository repo, InterestAreaService service) {
        this.repo    = repo;
        this.service = service;
    }

    /**
     * Save (replace) the tenant's interest area.
     * We delete the previous entry and insert the new one — a tenant has one active area at a time.
     */
    @Transactional
    @PostMapping
    public ResponseEntity<Void> saveArea(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody InterestAreaRequest req) {

        UUID userId = principal.getUserId();
        repo.deleteByUserId(userId);

        TenantInterestArea area = TenantInterestArea.builder()
                .userId(userId)
                .areaType(req.areaType())
                .cityName(req.cityName())
                .areaGeojson(req.areaGeojson())
                .build();
        repo.save(area);

        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<TenantInterestArea>> getAreas(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(repo.findByUserId(principal.getUserId()));
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
