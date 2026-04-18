package com.inquilino.controller;

import com.inquilino.dto.agency.AgencyProfileResponse;
import com.inquilino.dto.agency.AgencyProfileSummaryDto;
import com.inquilino.entity.AgencyProfile;
import com.inquilino.enums.AgencyStatus;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.AgencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/agencies")
@RequiredArgsConstructor
public class AgencyAdminController {

    private final AgencyService agencyService;

    @GetMapping
    public Page<AgencyProfileSummaryDto> list(
            @RequestParam(required = false) AgencyStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<AgencyProfile> page = status != null
                ? agencyService.listByStatus(status, pageable)
                : agencyService.listAll(pageable);
        List<AgencyProfileSummaryDto> content = page.getContent().stream()
                .map(agencyService::toSummary).toList();
        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    @GetMapping("/{id}")
    public AgencyProfileResponse getById(@PathVariable UUID id) {
        return agencyService.toResponse(agencyService.getById(id));
    }

    @PostMapping("/{id}/approve")
    public AgencyProfileResponse approve(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return agencyService.toResponse(agencyService.approve(id, principal.getUserId()));
    }

    @PostMapping("/{id}/reject")
    public AgencyProfileResponse reject(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        String note = body.getOrDefault("note", "");
        return agencyService.toResponse(agencyService.reject(id, note, principal.getUserId()));
    }

    @PostMapping("/{id}/suspend")
    public AgencyProfileResponse suspend(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        String note = body.getOrDefault("note", "");
        return agencyService.toResponse(agencyService.suspend(id, note, principal.getUserId()));
    }

    @PatchMapping("/{id}/areas")
    public AgencyProfileResponse updateAreas(
            @PathVariable UUID id,
            @RequestBody Map<String, List<Map<String, Object>>> body) {
        AgencyProfile agency = agencyService.getById(id);
        List<Map<String, Object>> areas = body.get("areas");
        return agencyService.toResponse(agencyService.updateAreas(agency.getUserId(), areas));
    }
}
