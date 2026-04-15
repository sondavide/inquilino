package com.inquilino.onboarding;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inquilino.dto.chat.ChecklistItemDto;
import com.inquilino.dto.chat.OnboardingStateDto;
import com.inquilino.onboarding.Suggestion;
import com.inquilino.entity.ChatMessage;
import com.inquilino.entity.OnboardingState;
import com.inquilino.entity.User;
import com.inquilino.enums.MessageRole;
import com.inquilino.enums.StepStatus;
import com.inquilino.repository.ChatMessageRepository;
import com.inquilino.repository.OnboardingStateRepository;
import com.inquilino.security.UserService;
import com.inquilino.service.GibberishDetector;
import com.inquilino.service.OnboardingPromptService;
import com.inquilino.service.TenantProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;
import reactor.core.scheduler.Schedulers;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OnboardingService {

    private final ChatClient chatClient;
    private final StepRegistry stepRegistry;
    private final OnboardingStateRepository stateRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserService userService;
    private final GibberishDetector gibberishDetector;
    private final ObjectMapper objectMapper;
    private final S3Client s3Client;
    private final TenantProfileService tenantProfileService;
    private final OnboardingPromptService onboardingPromptService;

    @Value("${minio.bucket}")
    private String bucket;

    // Ban thresholds
    private static final int STRIKES_WARN_MAX = 2;
    private static final int STRIKES_BAN_1H   = 3;
    private static final int STRIKES_BAN_24H  = 5;
    private static final int STRIKES_BAN_PERM = 7;

    // ─── Public API ──────────────────────────────────────────────────────────────

    public Flux<ServerSentEvent<String>> streamChat(UUID userId, String content, String lang) {
        User user = userService.findById(userId);
        Locale locale = parseLocale(lang);
        boolean isInit = content == null || content.isBlank();

        // ── Ban check ────────────────────────────────────────────────────────
        if (user.getChatBannedUntil() != null) {
            if (LocalDateTime.now().isBefore(user.getChatBannedUntil())) {
                return Flux.just(bannedEvent(user.getChatBannedUntil()));
            }
            user.setChatBannedUntil(null);
            userService.save(user);
        }

        // ── Gibberish / spam check ───────────────────────────────────────────
        if (!isInit && gibberishDetector.isGibberish(content)) {
            int strikes = user.getSpamStrikes() + 1;
            user.setSpamStrikes(strikes);

            if (strikes >= STRIKES_BAN_PERM) {
                user.setChatBannedUntil(LocalDateTime.of(9999, 1, 1, 0, 0));
                userService.save(user);
                return Flux.just(bannedEvent(user.getChatBannedUntil()));
            } else if (strikes >= STRIKES_BAN_24H) {
                user.setChatBannedUntil(LocalDateTime.now().plusHours(24));
                userService.save(user);
                return Flux.just(bannedEvent(user.getChatBannedUntil()));
            } else if (strikes >= STRIKES_BAN_1H) {
                user.setChatBannedUntil(LocalDateTime.now().plusHours(1));
                userService.save(user);
                return Flux.just(bannedEvent(user.getChatBannedUntil()));
            } else {
                userService.save(user);
                boolean it = "it".equals(locale.getLanguage());
                String warning = it
                        ? "⚠️ Il tuo messaggio sembra incomprensibile. Scrivi in italiano o in inglese. (" + strikes + "/" + STRIKES_BAN_1H + " avvertimenti)"
                        : "⚠️ Your message seems unintelligible. Please write in Italian or English. (" + strikes + "/" + STRIKES_BAN_1H + " warnings)";
                OnboardingState stateForWarn = stateRepository.findByUserId(userId)
                        .orElseGet(() -> createInitialState(user));
                try {
                    return Flux.fromIterable(List.of(
                            sse("token", objectMapper.writeValueAsString(warning)),
                            sse("state", objectMapper.writeValueAsString(buildStateDto(stateForWarn, user, locale, List.of())))
                    ));
                } catch (Exception e) {
                    return Flux.just(sse("token", "\"⚠️\""));
                }
            }
        }

        // ── Normal flow ──────────────────────────────────────────────────────
        Sinks.Many<ServerSentEvent<String>> sink =
                Sinks.many().unicast().onBackpressureBuffer();

        OnboardingState state = stateRepository.findByUserId(userId)
                .orElseGet(() -> createInitialState(user));

        // ── PHASE 1: Catch-up (session resume) ───────────────────────────────
        // If the current step was already completed (e.g. document uploaded between sessions),
        // advance through completed steps before doing anything else.
        advanceThroughCompletedSteps(state, user, locale);

        boolean isSkip = !isInit && isSkipIntent(content);

        // ── PHASE 2: Extract data BEFORE calling the LLM ─────────────────────
        // This is the core of the extract-first architecture: we know what the user
        // answered before we decide what to say next.
        String stepIdAtCallTime = state.getCurrentStep();
        OnboardingStep stepAtCallTime = stepRegistry.get(stepIdAtCallTime);

        if (!isInit && !isSkip) {
            String lastBotMsg = getLastBotMessage(userId, stepIdAtCallTime);
            extractAndMerge(state, stepAtCallTime, content, lastBotMsg, locale);
            stateRepository.save(state);
        }

        // ── PHASE 3: Advance step if all fields collected ────────────────────
        boolean stepAdvanced = false;
        if (!isInit) {
            OnboardingContext ctxAfterExtract = new OnboardingContext(state, user, locale);
            if (isSkip || stepAtCallTime.nextMissingField(ctxAfterExtract).isEmpty()) {
                stepAdvanced = forceAdvanceStep(state, stepAtCallTime, user, locale);
                if (stepAdvanced) {
                    // Chain through any subsequently-completed steps (e.g. session resumption)
                    advanceThroughCompletedSteps(state, user, locale);
                    stateRepository.save(state);
                }
            }
        }

        // ── PHASE 4: Persist user message (under the step it was sent in) ────
        if (!isInit) {
            chatMessageRepository.save(ChatMessage.builder()
                    .user(user).role(MessageRole.USER)
                    .content(content).step(stepIdAtCallTime).build());
        }

        // ── PHASE 5: Get current step (may have changed after advancement) ───
        OnboardingStep step = stepRegistry.get(state.getCurrentStep());
        OnboardingContext ctx = new OnboardingContext(state, user, locale);

        // ── PHASE 6: Mark optional field as "asked" ───────────────────────────
        // The service sets _asked_<field> BEFORE streaming so that on the very next
        // user turn, nextMissingField() returns empty and the step advances — even if
        // the user didn't answer the optional field directly.
        if (!stepAdvanced && !isInit) {
            step.nextMissingField(ctx).ifPresent(field -> {
                Map<String, Object> data = new HashMap<>(
                        state.getCollectedData() != null ? state.getCollectedData() : new HashMap<>());
                data.put("_asked_" + field, true);
                state.setCollectedData(data);
                stateRepository.save(state);
            });
            // Refresh context with updated markers
            ctx = new OnboardingContext(state, user, locale);
        }

        // ── PHASE 7: Build conversation history for LLM ───────────────────────
        List<Message> aiMessages = loadAiMessages(userId, state.getCurrentStep());
        // Fresh step (either init or just advanced): use [START] trigger
        if (aiMessages.isEmpty()) {
            aiMessages = List.of(new UserMessage("[START]"));
        }

        // ── PHASE 8: Build system prompt ──────────────────────────────────────
        final String langName = locale.getLanguage().equals("it") ? "Italian" : "English";

        // Simplified scopeGuard — no signal rules, no skip rules (handled by backend)
        String scopeGuard = """
                LANGUAGE (ABSOLUTE RULE): ALL your responses MUST be written in %s. \
                This overrides everything. Decision-tree questions and example phrases \
                are structural templates — adapt them to %s. Never mix languages.

                CRITICAL RULES:
                0. INIT TOKEN: If the user's message is "[START]", respond with the \
                opening message for this step as if the conversation is just beginning.
                1. SCOPE: Ask ONLY for the fields described in your prompt. Nothing else.
                2. ONE QUESTION: Ask for exactly one field per message. Never bundle questions.
                3. RE-ASK: If the user did not answer the expected field, politely ask \
                once more before moving on.
                4. NO PROCESS TALK: Do NOT mention profile completion, future steps, or \
                what comes next. The system handles transitions automatically.

                """.formatted(langName, langName);

        // Suppress re-greetings on every step transition.
        boolean isFirstEverMessage = "STEP_03".equals(state.getCurrentStep())
                && chatMessageRepository
                        .findByUserIdAndStepOrderByCreatedAtAsc(userId, "STEP_03")
                        .stream().noneMatch(m -> m.getRole() == MessageRole.ASSISTANT);
        String noGreetPrefix = isFirstEverMessage ? "" :
                "IMPORTANT: Do NOT greet the user, say 'Ciao', 'Hello' or similar. " +
                "Do NOT re-introduce yourself. Continue directly.\n\n";

        // Transition context: when step just advanced, ask the LLM to briefly
        // acknowledge the user's last answer before opening the new step.
        String transitionContext = "";
        if (stepAdvanced && !isInit && content != null && !content.isBlank()) {
            String snippet = content.length() > 200 ? content.substring(0, 200) + "…" : content;
            transitionContext = "TRANSITION: The user just completed the previous topic. " +
                    "Their last message was: \"" + snippet + "\". " +
                    "Start with a ONE-SENTENCE natural acknowledgment, then ask your first question.\n\n";
        }

        // Inject the specific next field so the LLM knows exactly what to ask.
        final OnboardingContext finalCtx = ctx;
        String fieldInjection = step.nextMissingField(finalCtx)
                .map(f -> "FIELD TO COLLECT NOW: \"" + f + "\"\n" +
                          step.fieldHint(f, finalCtx) + "\n\n")
                .orElse("");

        String resolvedStepPrompt = onboardingPromptService
                .resolveSystemPrompt(step.getStepId(), finalCtx)
                .orElseGet(() -> step.buildSystemPrompt(finalCtx));

        String fullSystemPrompt = scopeGuard + noGreetPrefix + transitionContext
                + fieldInjection + resolvedStepPrompt;

        // ── PHASE 9: Stream LLM ───────────────────────────────────────────────
        final StringBuilder responseBuffer = new StringBuilder();
        final String stepIdAtStreamTime = state.getCurrentStep();
        final boolean finalStepAdvanced = stepAdvanced;
        final OnboardingStep finalStep = step;
        final OnboardingState finalState = state;

        chatClient.prompt()
                .system(fullSystemPrompt)
                .messages(aiMessages)
                .stream()
                .content()
                .subscribe(
                        token -> {
                            responseBuffer.append(token);
                            try {
                                sink.tryEmitNext(sse("token", objectMapper.writeValueAsString(token)));
                            } catch (Exception e) {
                                sink.tryEmitNext(sse("token", "\"\""));
                            }
                        },
                        error -> {
                            log.error("LLM streaming error", error);
                            String msg = isRateLimitError(error)
                                    ? (locale.getLanguage().equals("it")
                                        ? "⚠️ Troppe richieste al servizio AI. Riprova tra qualche secondo."
                                        : "⚠️ Too many requests to the AI service. Please try again in a moment.")
                                    : (locale.getLanguage().equals("it")
                                        ? "⚠️ Errore temporaneo del servizio AI. Riprova."
                                        : "⚠️ Temporary AI service error. Please try again.");
                            sink.tryEmitNext(sse("token", msg));
                            sink.tryEmitComplete();
                        },
                        () -> {
                            // ── PHASE 10: Post-stream — persist only, no advancement ──
                            String fullResponse = responseBuffer.toString().stripTrailing();

                            Mono.fromCallable(() -> {
                                chatMessageRepository.save(ChatMessage.builder()
                                        .user(user).role(MessageRole.ASSISTANT)
                                        .content(fullResponse).step(stepIdAtStreamTime).build());

                                // Update profile completion percentage
                                Map<String, Object> collected = finalState.getCollectedData() != null
                                        ? finalState.getCollectedData() : Map.of();
                                long totalRequired = stepRegistry.getAll().stream()
                                        .flatMap(s -> s.getChecklistItems().stream())
                                        .filter(ChecklistItem::required)
                                        .count();
                                long collectedRequired = stepRegistry.getAll().stream()
                                        .flatMap(s -> s.getChecklistItems().stream())
                                        .filter(ChecklistItem::required)
                                        .filter(item -> item.isCollected(collected))
                                        .count();
                                int completionPct = totalRequired > 0
                                        ? (int) Math.round((double) collectedRequired / totalRequired * 100) : 0;
                                tenantProfileService.updateProfileCompletion(user.getId(), completionPct);

                                if ("STEP_18".equals(finalState.getCurrentStep())) {
                                    tenantProfileService.syncOnCompletion(user.getId());
                                }
                                saveChatLog(userId, user, finalState);

                                // Suggestions: use step-defined chips (suppress on transitions)
                                List<Suggestion> suggestions = finalStepAdvanced
                                        ? List.of()
                                        : finalStep.getSuggestions(finalCtx);

                                return buildStateDto(finalState, user, locale, suggestions);
                            })
                            .subscribeOn(Schedulers.boundedElastic())
                            .subscribe(
                                    dto -> {
                                        try {
                                            sink.tryEmitNext(sse("state", objectMapper.writeValueAsString(dto)));
                                            sink.tryEmitComplete();
                                        } catch (Exception e) {
                                            sink.tryEmitComplete();
                                        }
                                    },
                                    err -> {
                                        log.error("Post-stream processing error", err);
                                        sink.tryEmitComplete();
                                    }
                            );
                        }
                );

        return sink.asFlux();
    }

    public OnboardingStateDto getState(UUID userId, String lang) {
        User user = userService.findById(userId);
        Locale locale = parseLocale(lang);
        OnboardingState state = stateRepository.findByUserId(userId)
                .orElseGet(() -> createInitialState(user));
        advanceThroughCompletedSteps(state, user, locale);
        stateRepository.save(state);
        return buildStateDto(state, user, locale, List.of());
    }

    public List<ChatMessage> getHistory(UUID userId, String lang) {
        User user = userService.findById(userId);
        Locale locale = parseLocale(lang);
        OnboardingState state = stateRepository.findByUserId(userId)
                .orElseGet(() -> createInitialState(user));
        advanceThroughCompletedSteps(state, user, locale);
        stateRepository.save(state);
        return chatMessageRepository
                .findByUserIdAndStepOrderByCreatedAtAsc(userId, state.getCurrentStep());
    }

    /**
     * Unconditionally skips the current step and advances to the next one.
     * Called by the dedicated "skip step" button on the frontend.
     */
    public OnboardingStateDto skipStep(UUID userId, String lang) {
        User user = userService.findById(userId);
        Locale locale = parseLocale(lang);
        OnboardingState state = stateRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("No onboarding state"));

        OnboardingStep step = stepRegistry.get(state.getCurrentStep());
        log.info("User {} skipped step {}", userId, step.getStepId());
        forceAdvanceStep(state, step, user, locale);
        advanceThroughCompletedSteps(state, user, locale);
        stateRepository.save(state);

        return buildStateDto(state, user, locale, List.of());
    }

    public OnboardingStateDto goBack(UUID userId, String lang) {
        User user = userService.findById(userId);
        OnboardingState state = stateRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalStateException("No onboarding state"));
        stepRegistry.getPrevious(state.getCurrentStep()).ifPresent(prev -> {
            state.setCurrentStep(prev.getStepId());
            stateRepository.save(state);
        });
        return buildStateDto(state, user, parseLocale(lang), List.of());
    }

    // ─── Private helpers ─────────────────────────────────────────────────────────

    /**
     * Advances through any steps that are already completed (e.g. from a prior session
     * or a document upload event). Stops as soon as it reaches an incomplete step.
     * Called at the start of every public method to ensure the state is current.
     */
    private void advanceThroughCompletedSteps(OnboardingState state, User user, Locale locale) {
        if (state.getCompletedSteps() == null) state.setCompletedSteps(new ArrayList<>());

        for (int guard = 0; guard < 20; guard++) {
            OnboardingStep current = stepRegistry.get(state.getCurrentStep());
            OnboardingContext ctx = new OnboardingContext(state, user, locale);
            if (!current.isCompleted(ctx)) break;

            String nextId = current.resolveNextStep(ctx);
            if (nextId.equals(current.getStepId())) break; // terminal self-loop (STEP_18)

            if (!state.getCompletedSteps().contains(current.getStepId())) {
                List<String> updated = new ArrayList<>(state.getCompletedSteps());
                updated.add(current.getStepId());
                state.setCompletedSteps(updated);
            }
            state.setCurrentStep(nextId);
            state.setStepStatus(StepStatus.IN_PROGRESS);
        }
    }

    /**
     * Extracts structured data from the user's message and merges it into the state.
     * Retries up to 3 times on transient failures.
     */
    private void extractAndMerge(OnboardingState state, OnboardingStep step,
                                  String userMessage, String lastBotMessage, Locale locale) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                OnboardingContext ctx = new OnboardingContext(state, null, locale);
                String extractionPrompt = onboardingPromptService
                        .resolveExtractionPrompt(step.getStepId(), ctx)
                        .orElseGet(() -> step.buildExtractionPrompt(ctx));

                // Provide last bot message as context so the LLM can resolve
                // ambiguous short answers ("No", "Sì", "3") correctly.
                String contextualUser = (lastBotMessage == null || lastBotMessage.isBlank())
                        ? userMessage
                        : "Assistant: \"" + lastBotMessage.substring(0, Math.min(lastBotMessage.length(), 400)) + "\"\n"
                          + "User: \"" + userMessage + "\"";

                String raw = chatClient.prompt()
                        .system(extractionPrompt)
                        .user(contextualUser)
                        .call()
                        .content();

                String json = raw.replaceAll("(?s)```json\\s*(.*?)\\s*```", "$1").trim();
                if (!json.startsWith("{")) return;

                Map<String, Object> extracted = objectMapper.readValue(json, new TypeReference<>() {});
                Map<String, Object> data = new HashMap<>(
                        state.getCollectedData() != null ? state.getCollectedData() : new HashMap<>());
                extracted.forEach((k, v) -> { if (v != null) data.put(k, v); });
                state.setCollectedData(data);
                return; // success

            } catch (Exception e) {
                log.warn("Extraction attempt {}/3 failed for step {}: {}", attempt, step.getStepId(), e.getMessage());
                if (attempt == 3) {
                    log.error("Extraction failed after 3 attempts for step {}", step.getStepId());
                }
            }
        }
    }

    /**
     * Force-advances to the next step unconditionally.
     * Records the completed step in completedSteps.
     */
    private boolean forceAdvanceStep(OnboardingState state, OnboardingStep step,
                                     User user, Locale locale) {
        if (state.getCompletedSteps() == null) state.setCompletedSteps(new ArrayList<>());
        String nextId = step.resolveNextStep(new OnboardingContext(state, user, locale));
        if (nextId.equals(step.getStepId())) return false; // terminal self-loop

        if (!state.getCompletedSteps().contains(step.getStepId())) {
            List<String> updated = new ArrayList<>(state.getCompletedSteps());
            updated.add(step.getStepId());
            state.setCompletedSteps(updated);
        }
        state.setCurrentStep(nextId);
        state.setStepStatus(StepStatus.IN_PROGRESS);
        return true;
    }

    /**
     * Returns the last assistant message for the given step, used as extraction context.
     */
    private String getLastBotMessage(UUID userId, String stepId) {
        return chatMessageRepository
                .findByUserIdAndStepOrderByCreatedAtAsc(userId, stepId)
                .stream()
                .filter(m -> m.getRole() == MessageRole.ASSISTANT)
                .reduce((first, second) -> second)
                .map(ChatMessage::getContent)
                .orElse("");
    }

    /**
     * Loads the conversation history for the given step as Spring AI Message objects.
     */
    private List<Message> loadAiMessages(UUID userId, String stepId) {
        return chatMessageRepository
                .findByUserIdAndStepOrderByCreatedAtAsc(userId, stepId)
                .stream()
                .map(m -> (Message) (m.getRole() == MessageRole.USER
                        ? new UserMessage(m.getContent())
                        : new AssistantMessage(m.getContent())))
                .collect(Collectors.toList());
    }

    private OnboardingStateDto buildStateDto(OnboardingState state, User user,
                                              Locale locale, List<Suggestion> suggestions) {
        OnboardingStep step = stepRegistry.get(state.getCurrentStep());
        OnboardingContext ctx = new OnboardingContext(state, user, locale);
        boolean it = "it".equals(locale.getLanguage());
        int total   = stepRegistry.totalSteps();
        int stepNum = step.getStepNumber();
        int progress = total > 0 ? (int) Math.round((double) stepNum / total * 100) : 100;

        List<ChecklistItemDto> checklist = stepRegistry.getAll().stream()
                .flatMap(s -> s.getChecklistItems().stream())
                .map(item -> ChecklistItemDto.builder()
                        .key(item.key())
                        .label(it ? item.labelIt() : item.labelEn())
                        .required(item.required())
                        .collected(item.isCollected(state.getCollectedData()))
                        .build())
                .collect(Collectors.toList());

        return OnboardingStateDto.builder()
                .currentStep(state.getCurrentStep())
                .stepNumber(stepNum)
                .totalSteps(total)
                .progress(progress)
                .stepStatus(state.getStepStatus())
                .suggestions(suggestions)
                .checklistItems(checklist)
                .requiresDocumentUpload(step.requiresDocumentUpload())
                .expectedDocumentTypes(step.getExpectedDocumentTypes())
                .residenceAddress(String.valueOf(ctx.data().getOrDefault("residence", "")))
                .build();
    }

    private OnboardingState createInitialState(User user) {
        OnboardingState s = OnboardingState.builder()
                .user(user)
                .currentStep("STEP_03")
                .stepStatus(StepStatus.IN_PROGRESS)
                .collectedData(new HashMap<>())
                .completedSteps(new ArrayList<>())
                .missingFields(new ArrayList<>())
                .pendingActions(new ArrayList<>())
                .build();
        return stateRepository.save(s);
    }

    private static final Set<String> SKIP_KEYWORDS = Set.of(
            // Italian
            "salta", "salto", "saltare",
            "prosegui", "proseguo",
            "avanti", "vai avanti", "andiamo avanti",
            "continua", "continuo",
            "passa", "passo", "passare",
            "prossimo", "prossima",
            "procedi", "procedo",
            "non ho documenti", "no grazie", "ho finito", "finito",
            // English
            "skip", "next", "proceed", "continue", "move on", "go ahead",
            "go forward", "let's move on", "next step", "done", "no documents"
    );

    private static boolean isSkipIntent(String message) {
        if (message == null || message.isBlank()) return false;
        String lower = message.toLowerCase().strip();
        return SKIP_KEYWORDS.stream().anyMatch(lower::contains);
    }

    private static Locale parseLocale(String lang) {
        return "en".equalsIgnoreCase(lang) ? Locale.ENGLISH : Locale.ITALIAN;
    }

    private static ServerSentEvent<String> sse(String event, String data) {
        return ServerSentEvent.<String>builder().event(event).data(data).build();
    }

    private static boolean isRateLimitError(Throwable error) {
        return error instanceof org.springframework.web.reactive.function.client.WebClientResponseException ex
                && ex.getStatusCode().value() == 429;
    }

    private ServerSentEvent<String> bannedEvent(LocalDateTime until) {
        boolean permanent = until.getYear() >= 9999;
        String payload = permanent
                ? "{\"until\":\"permanent\"}"
                : "{\"until\":\"" + until + "\"}";
        return sse("banned", payload);
    }

    private void saveChatLog(UUID userId, User user, OnboardingState state) {
        try {
            List<ChatMessage> history = chatMessageRepository.findByUserIdOrderByCreatedAtAsc(userId);
            List<String> done = state.getCompletedSteps() != null ? state.getCompletedSteps() : List.of();

            StringBuilder sb = new StringBuilder();
            sb.append("=== Onboarding Chat Log ===\n");
            sb.append("User      : ").append(user.getEmail()).append(" (").append(userId).append(")\n");
            sb.append("Timestamp : ").append(LocalDateTime.now()).append("\n");
            sb.append("Current   : ").append(state.getCurrentStep()).append("\n");
            sb.append("Completed : ").append(done).append("\n");
            sb.append("Data      : ").append(state.getCollectedData()).append("\n");
            sb.append("=".repeat(60)).append("\n\n");

            String currentStep = null;
            for (ChatMessage m : history) {
                if (!m.getStep().equals(currentStep)) {
                    currentStep = m.getStep();
                    sb.append("--- ").append(currentStep)
                      .append(done.contains(currentStep) ? " [COMPLETED]" : " [IN PROGRESS]")
                      .append(" ---\n");
                }
                sb.append(m.getRole() == MessageRole.USER ? "USER : " : "BOT  : ");
                sb.append(m.getContent().replace("\n", "\n       ")).append("\n\n");
            }

            byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
            String key = "chat-logs/" + userId + "/onboarding_chat.txt";
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket).key(key)
                            .contentType("text/plain; charset=utf-8").build(),
                    RequestBody.fromBytes(bytes));
        } catch (Exception e) {
            log.warn("Failed to save chat log for user {}: {}", userId, e.getMessage());
        }
    }
}
