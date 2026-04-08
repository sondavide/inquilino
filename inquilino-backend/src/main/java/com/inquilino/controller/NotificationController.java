package com.inquilino.controller;

import com.inquilino.entity.ProfileNotification;
import com.inquilino.entity.PushSubscription;
import com.inquilino.repository.ProfileNotificationRepository;
import com.inquilino.repository.PushSubscriptionRepository;
import com.inquilino.security.UserPrincipal;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final ProfileNotificationRepository notificationRepo;
    private final PushSubscriptionRepository pushSubscriptionRepo;

    // ─── In-app notifications ─────────────────────────────────────────────────

    @GetMapping
    public List<ProfileNotification> getNotifications(
            @AuthenticationPrincipal UserPrincipal principal) {
        return notificationRepo.findByUserIdOrderByCreatedAtDesc(principal.getUserId());
    }

    @GetMapping("/unread-count")
    public Map<String, Long> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        return Map.of("count",
                notificationRepo.countByUserIdAndReadFalse(principal.getUserId()));
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        ProfileNotification n = notificationRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!n.getUserId().equals(principal.getUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        n.setRead(true);
        notificationRepo.save(n);
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
        List<ProfileNotification> unread = notificationRepo
                .findByUserIdOrderByCreatedAtDesc(principal.getUserId())
                .stream()
                .filter(n -> !n.isRead())
                .toList();
        unread.forEach(n -> n.setRead(true));
        notificationRepo.saveAll(unread);
    }

    // ─── Web Push subscriptions ───────────────────────────────────────────────

    @PostMapping("/push/subscribe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void subscribe(
            @RequestBody PushSubscribeRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        pushSubscriptionRepo.findByUserIdAndEndpoint(principal.getUserId(), req.endpoint())
                .ifPresentOrElse(
                        existing -> { /* già registrato, non fare nulla */ },
                        () -> pushSubscriptionRepo.save(PushSubscription.builder()
                                .userId(principal.getUserId())
                                .endpoint(req.endpoint())
                                .p256dh(req.p256dh())
                                .auth(req.auth())
                                .build())
                );
    }

    @DeleteMapping("/push/subscribe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void unsubscribe(
            @RequestBody PushUnsubscribeRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {

        pushSubscriptionRepo.deleteByUserIdAndEndpoint(principal.getUserId(), req.endpoint());
    }

    // ─── Inner records per i body delle richieste push ────────────────────────

    public record PushSubscribeRequest(String endpoint, String p256dh, String auth) {}

    public record PushUnsubscribeRequest(String endpoint) {}
}
