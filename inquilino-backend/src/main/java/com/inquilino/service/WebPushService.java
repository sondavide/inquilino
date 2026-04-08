package com.inquilino.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inquilino.entity.PushSubscription;
import com.inquilino.repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Invia notifiche push Web Push (VAPID) agli utenti registrati.
 * Se vapid.enabled=false registra solo un log.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WebPushService {

    private final PushSubscriptionRepository pushRepo;
    private final ObjectMapper objectMapper;

    @Value("${app.vapid.enabled:false}")
    private boolean enabled;

    @Value("${app.vapid.public-key:}")
    private String vapidPublicKey;

    @Value("${app.vapid.private-key:}")
    private String vapidPrivateKey;

    @Value("${app.vapid.subject:mailto:admin@inquilino.it}")
    private String vapidSubject;

    private PushService pushService;

    @PostConstruct
    void init() {
        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        if (enabled && !vapidPublicKey.isBlank() && !vapidPrivateKey.isBlank()) {
            try {
                pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
            } catch (Exception e) {
                log.error("Failed to initialize PushService: {}", e.getMessage());
            }
        }
    }

    public void sendToUser(UUID userId, String title, String body) {
        if (!enabled || pushService == null) {
            log.info("[PUSH DISABLED] userId={} title={} body={}", userId, title, body);
            return;
        }
        List<PushSubscription> subs = pushRepo.findByUserId(userId);
        for (PushSubscription sub : subs) {
            try {
                String payload = objectMapper.writeValueAsString(Map.of(
                        "title", title,
                        "body", body
                ));
                Notification notification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        payload
                );
                pushService.send(notification);
            } catch (Exception e) {
                log.warn("Push notification failed for subscription {}: {}", sub.getId(), e.getMessage());
            }
        }
    }
}
