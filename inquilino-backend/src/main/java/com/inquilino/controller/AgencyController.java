package com.inquilino.controller;

import com.inquilino.dto.agency.*;
import com.inquilino.entity.AgencyMembership;
import com.inquilino.entity.AgencyProfile;
import com.inquilino.enums.AgencyStatus;
import com.inquilino.enums.UserType;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.AgencyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/agency")
@RequiredArgsConstructor
public class AgencyController {

    private final AgencyService agencyService;

    // ─── Profilo ──────────────────────────────────────────────────────────────

    @GetMapping("/profile")
    public AgencyProfileResponse getProfile(@AuthenticationPrincipal UserPrincipal principal) {
        AgencyProfile profile = agencyService.resolveAgencyProfile(
                principal.getUserId(), principal.getUserType());
        return agencyService.toResponse(profile);
    }

    @PatchMapping("/profile")
    public AgencyProfileResponse updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UpdateAgencyProfileRequest req) {
        requireOwner(principal);
        requireActive(principal.getUserId());
        AgencyProfile updated = agencyService.updateProfile(principal.getUserId(), req);
        return agencyService.toResponse(updated);
    }

    // ─── Operatori ────────────────────────────────────────────────────────────

    @GetMapping("/operators")
    public List<AgencyMembershipDto> listOperators(@AuthenticationPrincipal UserPrincipal principal) {
        requireOwner(principal);
        UUID agencyUserId = principal.getUserId();
        return agencyService.listOperators(agencyUserId).stream()
                .map(agencyService::toMembershipDto).toList();
    }

    @PostMapping("/operators")
    @ResponseStatus(HttpStatus.CREATED)
    public AgencyMembershipDto inviteOperator(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody @Valid InviteOperatorRequest req) {
        requireOwner(principal);
        requireActive(principal.getUserId());
        AgencyMembership membership = agencyService.inviteOperator(principal.getUserId(), req);
        return agencyService.toMembershipDto(membership);
    }

    @PatchMapping("/operators/{operatorUserId}/scope")
    public AgencyMembershipDto updateOperatorScope(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID operatorUserId,
            @RequestBody UpdateOperatorScopeRequest req) {
        requireOwner(principal);
        AgencyMembership updated = agencyService.updateOperatorScope(
                principal.getUserId(), operatorUserId, req.listingScope());
        return agencyService.toMembershipDto(updated);
    }

    @DeleteMapping("/operators/{operatorUserId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeOperator(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID operatorUserId) {
        requireOwner(principal);
        agencyService.removeOperator(principal.getUserId(), operatorUserId);
    }

    // ─── Guard helpers ────────────────────────────────────────────────────────

    private void requireOwner(UserPrincipal principal) {
        if (principal.getUserType() != UserType.AGENCY) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the agency owner can perform this action");
        }
    }

    private void requireActive(UUID agencyUserId) {
        AgencyProfile profile = agencyService.getByUserId(agencyUserId);
        if (profile.getStatus() != AgencyStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Agency account is not yet active");
        }
    }
}
