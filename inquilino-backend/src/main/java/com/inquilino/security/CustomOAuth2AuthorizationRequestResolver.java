package com.inquilino.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/**
 * Estende il resolver standard per salvare il parametro "role" in sessione
 * prima del redirect verso il provider OAuth2.
 * Il valore viene poi letto da OAuth2SuccessHandler al callback.
 */
public class CustomOAuth2AuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    public static final String SESSION_KEY_ROLE = "oauth2_pending_role";

    private final DefaultOAuth2AuthorizationRequestResolver delegate;

    public CustomOAuth2AuthorizationRequestResolver(ClientRegistrationRepository repo) {
        this.delegate = new DefaultOAuth2AuthorizationRequestResolver(
                repo, "/oauth2/authorization");
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        OAuth2AuthorizationRequest authRequest = delegate.resolve(request);
        if (authRequest != null) saveRole(request);
        return authRequest;
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        OAuth2AuthorizationRequest authRequest = delegate.resolve(request, clientRegistrationId);
        if (authRequest != null) saveRole(request);
        return authRequest;
    }

    private void saveRole(HttpServletRequest request) {
        String role = request.getParameter("role");
        if (role != null && !role.isBlank()) {
            request.getSession(true).setAttribute(SESSION_KEY_ROLE, role.trim().toLowerCase());
        } else {
            // Non sovrascrivere se già presente (es. refresh)
            if (request.getSession(false) != null) {
                request.getSession().removeAttribute(SESSION_KEY_ROLE);
            }
        }
    }
}
