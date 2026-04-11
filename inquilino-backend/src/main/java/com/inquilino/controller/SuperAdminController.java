package com.inquilino.controller;

import com.inquilino.dto.admin.CreateSupervisorRequest;
import com.inquilino.entity.ProfileAuditLog;
import com.inquilino.entity.User;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.SuperAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    // ─── Supervisori ──────────────────────────────────────────────────────────

    @PostMapping("/supervisors")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createSupervisor(
            @RequestBody @Valid CreateSupervisorRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        User supervisor = superAdminService.createSupervisor(
                req.email(), req.password(), req.phone(), principal.getUserId());

        return Map.of(
                "id",    supervisor.getId(),
                "email", supervisor.getEmail(),
                "phone", supervisor.getPhone() != null ? supervisor.getPhone() : ""
        );
    }

    @GetMapping("/supervisors")
    public List<Map<String, Object>> listSupervisors() {
        return superAdminService.listSupervisors().stream()
                .map(u -> Map.<String, Object>of(
                        "id",    u.getId(),
                        "email", u.getEmail(),
                        "phone", u.getPhone() != null ? u.getPhone() : ""
                ))
                .toList();
    }

    // ─── Audit log ────────────────────────────────────────────────────────────

    @GetMapping("/audit-log")
    public Page<ProfileAuditLog> getAuditLog(
            @RequestParam(required = false) UUID profileId,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {

        return superAdminService.getAuditLog(profileId, q, pageable);
    }
}
