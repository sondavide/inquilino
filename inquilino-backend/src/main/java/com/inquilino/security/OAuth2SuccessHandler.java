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

        // Read role saved by CustomOAuth2AuthorizationRequestResolver
        String roleParam = null;
        jakarta.servlet.http.HttpSession session = request.getSession(false);
        if (session != null) {
            roleParam = (String) session.getAttribute(CustomOAuth2AuthorizationRequestResolver.SESSION_KEY_ROLE);
            session.removeAttribute(CustomOAuth2AuthorizationRequestResolver.SESSION_KEY_ROLE);
        }
        final String role = roleParam;

        User user = userRepository.findByProviderAndProviderUserId(provider, providerId)
                .orElseGet(() -> {
                    // Account già esistente con la stessa email → collega il provider
                    if (email != null) {
                        var existing = userRepository.findByEmail(email);
                        if (existing.isPresent()) {
                            User u = existing.get();
                            u.setProvider(provider);
                            u.setProviderUserId(providerId);
                            if (profileUrl != null) u.setProfileUrl(profileUrl);
                            return userRepository.save(u);
                        }
                    }
                    return createUser(provider, providerId, email, name, profileUrl, role);
                });

        String jwt = jwtService.generateToken(user.getId());
        response.sendRedirect(frontendUrl + "/auth/callback?token=" + jwt);
    }

    private User createUser(String provider, String providerId,
                            String email, String name, String profileUrl, String role) {
        // Fallback email for providers that don't share it
        String resolvedEmail = (email != null && !email.isBlank())
                ? email
                : provider + "_" + providerId + "@noemail.local";

        UserType userType = "landlord".equals(role) ? UserType.LANDLORD : UserType.TENANT;

        User user = User.builder()
                .type(userType)
                .email(resolvedEmail)
                .provider(provider)
                .providerUserId(providerId)
                .profileUrl(profileUrl)
                .verified(false)
                .build();
        user = userRepository.save(user);

        // Tenant: pre-fill onboarding state from OAuth2 profile
        if (userType == UserType.TENANT) {
            Map<String, Object> prefilled = new HashMap<>();
            if (name != null) prefilled.put("full_name", name);
            // email is stored in User.email — using _ prefix keeps it out of formattedData()
            // so it doesn't confuse LLM steps that review collected fields
            if (email != null) prefilled.put("_provider_email", email);
            prefilled.put("_provider", provider);

            onboardingStateRepository.save(OnboardingState.builder()
                    .user(user)
                    .currentStep("STEP_03")
                    .stepStatus(StepStatus.IN_PROGRESS)
                    .collectedData(prefilled)
                    .completedSteps(new ArrayList<>())
                    .missingFields(new ArrayList<>())
                    .pendingActions(new ArrayList<>())
                    .build());
        }

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
