package com.inquilino.controller;

import com.inquilino.dto.chat.ChatHistoryItemDto;
import com.inquilino.dto.chat.ChatRequest;
import com.inquilino.dto.chat.OnboardingStateDto;
import com.inquilino.entity.ChatMessage;
import com.inquilino.onboarding.OnboardingService;
import com.inquilino.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;

@RestController
@RequestMapping("/api/onboarding")
@RequiredArgsConstructor
public class ChatController {

    private final OnboardingService onboardingService;

    /**
     * Main chat endpoint — streams SSE events:
     *   event: token  →  data: <text fragment>
     *   event: state  →  data: <OnboardingStateDto JSON>
     */
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> chat(
            @RequestBody ChatRequest request,
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang,
            @AuthenticationPrincipal UserPrincipal principal) {

        String cleanLang = lang.toLowerCase().startsWith("it") ? "it" : "en";
        return onboardingService.streamChat(principal.getUserId(), request.getContent(), cleanLang);
    }

    /** Returns current onboarding state (checklist, progress, suggestions). */
    @GetMapping("/state")
    public OnboardingStateDto getState(
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang,
            @AuthenticationPrincipal UserPrincipal principal) {

        String cleanLang = lang.toLowerCase().startsWith("it") ? "it" : "en";
        return onboardingService.getState(principal.getUserId(), cleanLang);
    }

    /**
     * Returns the chat messages for the current step so the frontend can
     * restore the conversation when the user resumes the session.
     */
    @GetMapping("/history")
    public List<ChatHistoryItemDto> getHistory(
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang,
            @AuthenticationPrincipal UserPrincipal principal) {

        String cleanLang = lang.toLowerCase().startsWith("it") ? "it" : "en";
        return onboardingService.getHistory(principal.getUserId(), cleanLang)
                .stream()
                .map(m -> new ChatHistoryItemDto(
                        m.getId().toString(),
                        m.getRole().name(),
                        m.getContent(),
                        m.getCreatedAt().toString()))
                .toList();
    }

    /** Go back to the previous step. */
    @PostMapping("/back")
    public OnboardingStateDto goBack(
            @RequestHeader(value = "Accept-Language", defaultValue = "it") String lang,
            @AuthenticationPrincipal UserPrincipal principal) {

        String cleanLang = lang.toLowerCase().startsWith("it") ? "it" : "en";
        return onboardingService.goBack(principal.getUserId(), cleanLang);
    }
}
