package com.inquilino.controller;

import com.inquilino.dto.agency.AgencyProfileResponse;
import com.inquilino.dto.auth.AuthResponse;
import com.inquilino.dto.auth.LoginRequest;
import com.inquilino.dto.auth.RegisterAgencyRequest;
import com.inquilino.dto.auth.RegisterRequest;
import com.inquilino.dto.auth.RegisterLandlordRequest;
import com.inquilino.entity.AgencyProfile;
import com.inquilino.enums.AgencyStatus;
import com.inquilino.entity.LandlordProfile;
import com.inquilino.entity.OnboardingState;
import com.inquilino.entity.User;
import com.inquilino.enums.PublisherType;
import com.inquilino.enums.StepStatus;
import com.inquilino.enums.UserType;
import com.inquilino.repository.AgencyProfileRepository;
import com.inquilino.repository.LandlordProfileRepository;
import com.inquilino.repository.OnboardingStateRepository;
import com.inquilino.repository.TenantProfileRepository;
import com.inquilino.repository.UserRepository;
import com.inquilino.service.AgencyService;
import com.inquilino.security.JwtService;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.EmailVerificationService;
import com.inquilino.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final OnboardingStateRepository onboardingStateRepository;
    private final LandlordProfileRepository landlordProfileRepository;
    private final TenantProfileRepository tenantProfileRepository;
    private final AgencyProfileRepository agencyProfileRepository;
    private final AgencyService agencyService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailVerificationService emailVerificationService;
    private final PasswordResetService passwordResetService;

    // ─── Email verification (pre-registration OTP) ───────────────────────────

    @PostMapping("/request-email-verification")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestEmailVerification(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim().toLowerCase();
        if (email.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email required");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        emailVerificationService.requestVerification(email);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@RequestBody @Valid RegisterRequest req) {
        // Email uniqueness check (double-check — also verified before OTP was sent)
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        // Validate OTP code
        if (!emailVerificationService.verifyAndConsume(req.getEmail(), req.getVerificationCode())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid or expired verification code");
        }

        User user = User.builder()
                .type(UserType.TENANT)
                .email(req.getEmail())
                .phone(req.getPhone())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .verified(false)
                .build();
        user = userRepository.save(user);

        Map<String, Object> prefilled = new HashMap<>();
        prefilled.put("email", req.getEmail());

        onboardingStateRepository.save(OnboardingState.builder()
                .user(user)
                .currentStep("STEP_03")
                .stepStatus(StepStatus.IN_PROGRESS)
                .collectedData(prefilled)
                .missingFields(new ArrayList<>())
                .pendingActions(new ArrayList<>())
                .build());

        // Create a minimal TenantProfile immediately so the tenant is visible to supervisors
        tenantProfileRepository.save(com.inquilino.entity.TenantProfile.builder().user(user).build());

        return new AuthResponse(jwtService.generateToken(user.getId()),
                user.getId().toString(), user.getEmail());
    }

    // ─── Registrazione Landlord / Agenzia ────────────────────────────────────

    @PostMapping("/register/landlord")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerLandlord(@RequestBody @Valid RegisterLandlordRequest req) {
        // Email uniqueness check
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        // Validate OTP code
        if (!emailVerificationService.verifyAndConsume(req.getEmail(), req.getVerificationCode())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid or expired verification code");
        }

        // Determina UserType: AGENCY se publisherType è AGENCY, altrimenti LANDLORD
        UserType userType = "AGENCY".equalsIgnoreCase(req.getPublisherType())
                ? UserType.AGENCY
                : UserType.LANDLORD;

        User user = User.builder()
                .type(userType)
                .email(req.getEmail())
                .phone(req.getPhone())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .verified(false)
                .build();
        user = userRepository.save(user);

        // Crea profilo landlord
        LandlordProfile profile = LandlordProfile.builder()
                .userId(user.getId())
                .displayName(req.getDisplayName())
                .agencyName(req.getAgencyName())
                .vatNumber(req.getVatNumber())
                .reaNumber(req.getReaNumber())
                .contactMode(req.getContactMode() != null ? req.getContactMode() : "platform_only")
                .contactPhone(req.getContactPhone())
                .contactEmail(req.getContactEmail() != null ? req.getContactEmail() : req.getEmail())
                .websiteUrl(req.getWebsiteUrl())
                .build();
        landlordProfileRepository.save(profile);

        return new AuthResponse(jwtService.generateToken(user.getId()),
                user.getId().toString(), user.getEmail());
    }

    // ─── Registrazione Agenzia ────────────────────────────────────────────────

    @PostMapping("/register/agency")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registerAgency(@RequestBody @Valid RegisterAgencyRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }
        if (!emailVerificationService.verifyAndConsume(req.getEmail(), req.getVerificationCode())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid or expired verification code");
        }

        User user = User.builder()
                .type(UserType.AGENCY)
                .email(req.getEmail())
                .phone(req.getPhone())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .verified(false)
                .build();
        user = userRepository.save(user);

        AgencyProfile profile = AgencyProfile.builder()
                .userId(user.getId())
                .agencyName(req.getAgencyName())
                .vatNumber(req.getVatNumber())
                .reaNumber(req.getReaNumber())
                .websiteUrl(req.getWebsiteUrl())
                .contactEmail(req.getEmail())
                .contactPhone(req.getContactPhone())
                .status(AgencyStatus.PENDING_APPROVAL)
                .build();
        agencyProfileRepository.save(profile);

        return new AuthResponse(jwtService.generateToken(user.getId()),
                user.getId().toString(), user.getEmail());
    }

    // ─── Password reset ───────────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim();
        if (!email.isEmpty()) {
            passwordResetService.requestReset(email);
        }
        // Risposta sempre 204 — non rivela se l'email è registrata
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@RequestBody Map<String, String> body) {
        String token       = body.getOrDefault("token", "").trim();
        String newPassword = body.getOrDefault("newPassword", "").trim();
        if (newPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password too short");
        }
        if (!passwordResetService.resetPassword(token, newPassword)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Invalid or expired reset token");
        }
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody @Valid LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));

        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        return new AuthResponse(jwtService.generateToken(user.getId()),
                user.getId().toString(), user.getEmail());
    }

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal UserPrincipal principal) {
        Map<String, Object> result = new HashMap<>();
        result.put("userId",   principal.getUserId());
        result.put("email",    principal.getEmail());
        result.put("userType", principal.getUserType());
        if (principal.getUserType() == UserType.TENANT) {
            boolean completed = onboardingStateRepository.findByUserId(principal.getUserId())
                    .map(s -> "STEP_18".equals(s.getCurrentStep()))
                    .orElse(false);
            result.put("onboardingCompleted", completed);
            tenantProfileRepository.findByUserId(principal.getUserId()).ifPresent(p ->
                result.put("verificationStatus", p.getVerificationStatus())
            );
        } else if (principal.getUserType() == UserType.AGENCY) {
            agencyProfileRepository.findByUserId(principal.getUserId()).ifPresent(p -> {
                result.put("agencyStatus", p.getStatus());
                result.put("agencyId", p.getId());
            });
        } else if (principal.getUserType() == UserType.AGENCY_OPERATOR) {
            result.put("agencyStatus", "ACTIVE"); // gli operatori esistono solo in agenzie attive
        }
        return result;
    }
}
