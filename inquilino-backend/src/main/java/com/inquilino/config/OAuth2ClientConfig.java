package com.inquilino.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.IdTokenClaimNames;

import java.util.ArrayList;
import java.util.List;

/**
 * Registra i provider OAuth2 solo se le credenziali sono valorizzate.
 * Attivo solo con il profilo "oauth".
 */
@Configuration
@Profile("oauth")
@ConditionalOnExpression(
    "T(org.springframework.util.StringUtils).hasText('${GOOGLE_CLIENT_ID:}') " +
    "|| T(org.springframework.util.StringUtils).hasText('${LINKEDIN_CLIENT_ID:}')"
)
public class OAuth2ClientConfig {

    @Value("${GOOGLE_CLIENT_ID:}")   private String googleClientId;
    @Value("${GOOGLE_CLIENT_SECRET:}") private String googleClientSecret;

    @Value("${LINKEDIN_CLIENT_ID:}")   private String linkedinClientId;
    @Value("${LINKEDIN_CLIENT_SECRET:}") private String linkedinClientSecret;

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        List<ClientRegistration> registrations = new ArrayList<>();

        if (hasValue(googleClientId) && hasValue(googleClientSecret)) {
            registrations.add(googleRegistration());
        }
        if (hasValue(linkedinClientId) && hasValue(linkedinClientSecret)) {
            registrations.add(linkedinRegistration());
        }

        return new InMemoryClientRegistrationRepository(registrations);
    }

    private ClientRegistration googleRegistration() {
        return ClientRegistration.withRegistrationId("google")
                .clientId(googleClientId)
                .clientSecret(googleClientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .scope("openid", "profile", "email")
                .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                .tokenUri("https://www.googleapis.com/oauth2/v4/token")
                .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
                .userNameAttributeName(IdTokenClaimNames.SUB)
                .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                .clientName("Google")
                .build();
    }

    private ClientRegistration linkedinRegistration() {
        return ClientRegistration.withRegistrationId("linkedin")
                .clientId(linkedinClientId)
                .clientSecret(linkedinClientSecret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .scope("openid", "profile", "email")
                .authorizationUri("https://www.linkedin.com/oauth/v2/authorization")
                .tokenUri("https://www.linkedin.com/oauth/v2/accessToken")
                .userInfoUri("https://api.linkedin.com/v2/userinfo")
                .userNameAttributeName("sub")
                .clientName("LinkedIn")
                .build();
    }

    private boolean hasValue(String s) {
        return s != null && !s.isBlank();
    }
}
