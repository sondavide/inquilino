package com.inquilino.controller;

import com.inquilino.dto.auth.AuthResponse;
import com.inquilino.dto.auth.LoginRequest;
import com.inquilino.dto.auth.RegisterRequest;
import com.inquilino.entity.OnboardingState;
import com.inquilino.entity.User;
import com.inquilino.enums.StepStatus;
import com.inquilino.enums.UserType;
import com.inquilino.repository.OnboardingStateRepository;
import com.inquilino.repository.UserRepository;
import com.inquilino.security.JwtService;
import com.inquilino.security.UserPrincipal;
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
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@RequestBody @Valid RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
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

        return new AuthResponse(jwtService.generateToken(user.getId()),
                user.getId().toString(), user.getEmail());
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
        return Map.of(
                "userId",   principal.getUserId(),
                "email",    principal.getEmail(),
                "userType", principal.getUserType()
        );
    }
}
