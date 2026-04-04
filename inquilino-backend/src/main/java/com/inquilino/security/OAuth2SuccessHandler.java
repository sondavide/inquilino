package com.inquilino.security;

import com.inquilino.entity.OnboardingState;
import com.inquilino.entity.User;
import com.inquilino.enums.StepStatus;
import com.inquilino.enums.UserType;
import com.inquilino.repository.OnboardingStateRepository;
import com.inquilino.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.*;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final OnboardingStateRepository onboardingStateRepository;
    private final JwtService jwtService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauth2User = token.getPrincipal();
        String provider = token.getAuthorizedClientRegistrationId();
        Map<String, Object> attrs = oauth2User.getAttributes();

        String providerId = getAttr(attrs, "sub", "id");
        String email     = getAttr(attrs, "email");
        String name      = getAttr(attrs, "name");
        String profileUrl = getAttr(attrs, "picture", "link");

        User user = userRepository.findByProviderAndProviderUserId(provider, providerId)
                .orElseGet(() -> createUser(provider, providerId, email, name, profileUrl));

        String jwt = jwtService.generateToken(user.getId());
        response.sendRedirect(frontendUrl + "/auth/callback?token=" + jwt);
    }

    private User createUser(String provider, String providerId,
                            String email, String name, String profileUrl) {
        // Fallback email for providers that don't share it
        String resolvedEmail = (email != null && !email.isBlank())
                ? email
                : provider + "_" + providerId + "@noemail.local";

        User user = User.builder()
                .type(UserType.TENANT)
                .email(resolvedEmail)
                .provider(provider)
                .providerUserId(providerId)
                .profileUrl(profileUrl)
                .verified(false)
                .build();
        user = userRepository.save(user);

        // Pre-fill onboarding data from OAuth2 profile
        Map<String, Object> prefilled = new HashMap<>();
        if (name  != null) prefilled.put("full_name", name);
        if (email != null) prefilled.put("email", email);
        prefilled.put("_provider", provider);

        onboardingStateRepository.save(OnboardingState.builder()
                .user(user)
                .currentStep("STEP_03")
                .stepStatus(StepStatus.IN_PROGRESS)
                .collectedData(prefilled)
                .missingFields(new ArrayList<>())
                .pendingActions(new ArrayList<>())
                .build());

        return user;
    }

    private String getAttr(Map<String, Object> attrs, String... keys) {
        for (String key : keys) {
            Object v = attrs.get(key);
            if (v != null) return v.toString();
        }
        return null;
    }
}
