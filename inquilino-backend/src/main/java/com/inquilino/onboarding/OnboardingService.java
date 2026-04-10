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

    @Value("${minio.bucket}")
    private String bucket;

    // Ban thresholds (number of cumulative spam strikes)
    private static final int STRIKES_WARN_MAX  = 2;  // 1-2 strikes: warn only
    private static final int STRIKES_BAN_1H    = 3;  // 3-4 strikes: 1-hour ban
    private static final int STRIKES_BAN_24H   = 5;  // 5-6 strikes: 24-hour ban
    private static final int STRIKES_BAN_PERM  = 7;  // 7+ strikes: permanent ban

    // ─── Public API ──────────────────────────────────────────────────────────────

    public Flux<ServerSentEvent<String>> streamChat(UUID userId, String content, String lang) {
        User user = userService.findById(userId);
        Locale locale  = parseLocale(lang);
        boolean isInit = content == null || content.isBlank();

        // ── Ban check ────────────────────────────────────────────────────────
        if (user.getChatBannedUntil() != null) {
            if (LocalDateTime.now().isBefore(user.getChatBannedUntil())) {
                return Flux.just(bannedEvent(user.getChatBannedUntil()));
            }
            // Ban expired — lift it
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
                // 1–2 strikes: warn without calling the LLM
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

        // Catch-up: if the current step was already completed in a previous session
        // (e.g. session ended before the advance ran), advance now before generating a response.
        {
            OnboardingStep catchUpStep = stepRegistry.get(state.getCurrentStep());
            OnboardingContext catchUpCtx = new OnboardingContext(state, user, locale);
            if (catchUpStep.isCompleted(catchUpCtx)) {
                maybeAdvanceStep(state, catchUpStep, user, locale);
                stateRepository.save(state);
            }
        }

        OnboardingStep step = stepRegistry.get(state.getCurrentStep());
        OnboardingContext ctx = new OnboardingContext(state, user, locale);

        // Persist user message (skip for init call)
        if (!isInit) {
            chatMessageRepository.save(ChatMessage.builder()
                    .user(user).role(MessageRole.USER)
                    .content(content).step(state.getCurrentStep()).build());
        }

        // Build conversation history for the current step
        List<com.inquilino.entity.ChatMessage> history =
                chatMessageRepository.findByUserIdAndStepOrderByCreatedAtAsc(userId, state.getCurrentStep());

        List<Message> aiMessages = history.stream()
                .map(m -> (Message) (m.getRole() == MessageRole.USER
                        ? new UserMessage(m.getContent())
                        : new AssistantMessage(m.getContent())))
                .collect(Collectors.toList());

        // For init with no history, provide a silent trigger so GPT produces an opening message
        if (isInit && aiMessages.isEmpty()) {
            String trigger = locale.getLanguage().equals("it")
                    ? "Voglio iniziare la procedura di registrazione come inquilino."
                    : "I want to start the tenant registration process.";
            aiMessages.add(new UserMessage(trigger));
        }

        final StringBuilder responseBuffer = new StringBuilder();
        final String stepIdAtCallTime = state.getCurrentStep();

        // Suppress re-greetings on every step transition.
        // Only Step03's very first message (empty assistant history) is allowed to greet.
        boolean isFirstEverMessage = "STEP_03".equals(state.getCurrentStep())
                && history.stream().noneMatch(m -> m.getRole() == MessageRole.ASSISTANT);
        String noGreetPrefix = isFirstEverMessage ? "" :
                "IMPORTANT: This is an ongoing conversation — do NOT greet the user, " +
                "say 'Ciao', 'Hello', 'Buongiorno' or similar. Do NOT address them by name. " +
                "Do NOT re-introduce yourself. Continue directly with your task.\n\n";

        // Global strict rules injected into every step prompt.
        String scopeGuard = """
                CRITICAL OPERATIONAL RULES — MUST FOLLOW EXACTLY:

                1. SCOPE: Ask ONLY for the required fields described in your system prompt. \
                Do NOT ask about anything else, even if it seems relevant to tenant screening.

                2. ONE QUESTION AT A TIME: Ask for exactly one field per message. \
                Never bundle multiple unrelated questions in a single message.

                3. RE-ASK IF UNANSWERED: If you asked a field and the user's reply did not answer it \
                (e.g. they answered something else), politely re-ask the same question once \
                before moving on.

                4. COMPLETION SIGNAL: When ALL required fields for this step are collected, output \
                EXACTLY ONE short confirmation sentence (e.g. "Perfetto, ho tutte le informazioni." \
                or "Perfect, I have everything I need."). Then STOP COMPLETELY. Do NOT:
                   - Ask any follow-up question
                   - Say "fammi sapere", "let me know", "dimmi quando sei pronto", \
                "se vuoi continuare" or any similar invitation
                   - Mention future steps, documents, or what comes next
                   - Ask the user if they want to proceed

                5. SKIP HANDLING: If the user says "salta", "prosegui", "avanti", "vai avanti", \
                "skip", "next", "continua", "passa" or similar, respond with ONLY: \
                "Va bene, andiamo avanti." (Italian) or "Alright, let's move on." (English). \
                Do NOT ask any more questions for this step.

                6. NO PROCESS TALK: Do NOT tell the user their profile or onboarding is complete or \
                finished. The system handles step transitions automatically.

                """;


        chatClient.prompt()
                .system(scopeGuard + noGreetPrefix + step.buildSystemPrompt(ctx))
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
                            String fullResponse = responseBuffer.toString();
                            Mono.fromCallable(() -> {
                                // Persist assistant response
                                chatMessageRepository.save(ChatMessage.builder()
                                        .user(user).role(MessageRole.ASSISTANT)
                                        .content(fullResponse).step(stepIdAtCallTime).build());

                                // Extract structured data and advance step if complete
                                boolean stepAdvanced = false;
                                if (!isInit) {
                                    extractAndMerge(state, step, content, fullResponse, locale);
                                    // If user explicitly asked to skip/proceed, force-advance
                                    // regardless of isCompleted (missing fields stay null).
                                    if (isSkipIntent(content)) {
                                        stepAdvanced = forceAdvanceStep(state, step, user, locale);
                                    } else {
                                        stepAdvanced = maybeAdvanceStep(state, step, user, locale);
                                    }
                                }
                                stateRepository.save(state);

                                // Sync profile when onboarding completes
                                if ("STEP_18".equals(state.getCurrentStep())) {
                                    tenantProfileService.syncOnCompletion(user.getId());
                                }
                                saveChatLog(userId, user, state);

                                // Generate contextual suggestions from the bot's actual response.
                                // Suppressed on step transitions (the new step hasn't greeted yet).
                                List<Suggestion> suggestions = stepAdvanced
                                        ? List.of()
                                        : generateSuggestions(fullResponse, locale);

                                OnboardingStateDto dto = buildStateDto(state, user, locale, suggestions);
                                return dto;
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
        // Catch-up: advance completed steps so the returned state is always current
        OnboardingStep catchUpStep = stepRegistry.get(state.getCurrentStep());
        OnboardingContext catchUpCtx = new OnboardingContext(state, user, locale);
        if (catchUpStep.isCompleted(catchUpCtx)) {
            maybeAdvanceStep(state, catchUpStep, user, locale);
            stateRepository.save(state);
        }
        return buildStateDto(state, user, locale, List.of());
    }

    /**
     * Returns the chat messages for the current step (used by the frontend to
     * restore the conversation when the user resumes the onboarding session).
     */
    public List<com.inquilino.entity.ChatMessage> getHistory(UUID userId, String lang) {
        User user = userService.findById(userId);
        Locale locale = parseLocale(lang);
        OnboardingState state = stateRepository.findByUserId(userId)
                .orElseGet(() -> createInitialState(user));
        // Run catch-up so we return history for the correct (possibly advanced) step
        OnboardingStep catchUpStep = stepRegistry.get(state.getCurrentStep());
        OnboardingContext catchUpCtx = new OnboardingContext(state, user, locale);
        if (catchUpStep.isCompleted(catchUpCtx)) {
            maybeAdvanceStep(state, catchUpStep, user, locale);
            stateRepository.save(state);
        }
        return chatMessageRepository
                .findByUserIdAndStepOrderByCreatedAtAsc(userId, state.getCurrentStep());
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

    private void extractAndMerge(OnboardingState state, OnboardingStep step,
                                  String userMessage, String lastBotMessage, Locale locale) {
        try {
            OnboardingContext ctx = new OnboardingContext(state, null, locale);
            // Include the last bot message so the extraction LLM can resolve
            // ambiguous short answers like "No", "Sì", "2" with the right context.
            String contextualUser = (lastBotMessage == null || lastBotMessage.isBlank())
                    ? userMessage
                    : "Assistant: \"" + lastBotMessage.substring(0, Math.min(lastBotMessage.length(), 400)) + "\"\n"
                      + "User: \"" + userMessage + "\"";
            String raw = chatClient.prompt()
                    .system(step.buildExtractionPrompt(ctx))
                    .user(contextualUser)
                    .call()
                    .content();

            // Strip markdown code fences if present
            String json = raw.replaceAll("(?s)```json\\s*(.*?)\\s*```", "$1").trim();
            if (!json.startsWith("{")) return;

            Map<String, Object> extracted = objectMapper.readValue(json, new TypeReference<>() {});
            // Build a new map to ensure Hibernate detects the change on the @JdbcTypeCode(JSON) column
            Map<String, Object> data = new HashMap<>(
                    state.getCollectedData() != null ? state.getCollectedData() : new HashMap<>());
            extracted.forEach((k, v) -> { if (v != null) data.put(k, v); });
            state.setCollectedData(data);

        } catch (Exception e) {
            log.warn("Extraction failed for step {}: {}", step.getStepId(), e.getMessage());
        }
    }

    /**
     * Advances the step if it is complete, then chains through subsequent steps that
     * were ALREADY completed in a previous interaction (i.e. present in completedSteps).
     * Steps never completed by the user are always stopped at, even if isCompleted()
     * returns true based on accidentally cross-contaminated collectedData.
     * Records every completed step in state.completedSteps (the step manager).
     */
    private boolean maybeAdvanceStep(OnboardingState state, OnboardingStep step,
                                     User user, Locale locale) {
        if (state.getCompletedSteps() == null) state.setCompletedSteps(new ArrayList<>());

        boolean advanced = false;
        OnboardingStep current = step;

        for (int guard = 0; guard < 20; guard++) {
            OnboardingContext ctx = new OnboardingContext(state, user, locale);
            if (!current.isCompleted(ctx)) break;

            String nextId = current.resolveNextStep(ctx);
            if (nextId.equals(current.getStepId())) break; // terminal self-loop (STEP_18)

            // Mark this step as completed (replace list to trigger Hibernate dirty detection)
            if (!state.getCompletedSteps().contains(current.getStepId())) {
                List<String> updated = new ArrayList<>(state.getCompletedSteps());
                updated.add(current.getStepId());
                state.setCompletedSteps(updated);
            }

            state.setCurrentStep(nextId);
            state.setStepStatus(StepStatus.IN_PROGRESS);
            advanced = true;

            OnboardingStep next = stepRegistry.get(nextId);
            if (!next.getStepId().equals(nextId)) break; // unknown step id

            // Only continue chaining if the next step was already completed in a prior
            // interaction. New steps must always be presented to the user.
            if (!state.getCompletedSteps().contains(nextId)) break;

            current = next;
        }
        return advanced;
    }

    private OnboardingStateDto buildStateDto(OnboardingState state, User user,
                                              Locale locale, List<Suggestion> suggestions) {
        OnboardingStep step = stepRegistry.get(state.getCurrentStep());
        OnboardingContext ctx = new OnboardingContext(state, user, locale);
        boolean it = "it".equals(locale.getLanguage());
        int total   = stepRegistry.totalSteps();
        int stepNum = step.getStepNumber();
        // stepNum/total: step 1 → ~6%, step 16 → 100%
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

    /**
     * Asks the LLM to generate 2–4 short reply suggestions based on what the bot
     * just said. Returns an empty list if no discrete choices are apparent (open
     * free-text questions) or if the call fails.
     */
    private List<Suggestion> generateSuggestions(String botMessage, Locale locale) {
        if (botMessage == null || botMessage.isBlank()) return List.of();
        try {
            String prompt = """
                    The following message was sent by an assistant in a tenant onboarding chatbot:

                    ---
                    %s
                    ---

                    Generate 2–4 short, natural user reply options that directly answer or respond to
                    what the assistant asked. Rules:
                    - Return ONLY a JSON array: [{"label":"...","value":"..."}]
                    - label: the text shown to the user (natural language, up to ~40 chars)
                    - value: the text that will be sent as the user's message (concise)
                    - Both label and value MUST be in the SAME language as the assistant message (%s)
                    - Generate suggestions ONLY when there are clear discrete choices
                      (yes/no, select one of X options, confirm/correct, etc.)
                    - For open-ended questions (name, date, address, income amount, free text)
                      return an EMPTY array: []
                    - Do NOT add suggestions for document upload prompts
                    - Return ONLY the JSON array, no markdown, no explanation
                    """.formatted(botMessage, locale.getLanguage().equals("it") ? "Italian" : "English");

            String raw = chatClient.prompt()
                    .system(prompt)
                    .user("Generate suggestions now.")
                    .call()
                    .content();

            String json = raw.replaceAll("(?s)```json\\s*(.*?)\\s*```", "$1").trim();
            if (!json.startsWith("[")) return List.of();

            List<Map<String, String>> parsed = objectMapper.readValue(json, new TypeReference<>() {});
            return parsed.stream()
                    .filter(m -> m.containsKey("label") && m.containsKey("value"))
                    .map(m -> new Suggestion(m.get("label"), m.get("value")))
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Suggestion generation failed: {}", e.getMessage());
            return List.of();
        }
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
            "salta", "prosegui", "avanti", "vai avanti", "skip", "next",
            "continua", "passa", "prossimo", "procedi", "andiamo avanti"
    );

    private static boolean isSkipIntent(String message) {
        if (message == null || message.isBlank()) return false;
        String lower = message.toLowerCase().strip();
        return SKIP_KEYWORDS.stream().anyMatch(lower::contains);
    }

    /**
     * Force-advances the current step without checking isCompleted().
     * Used when the user explicitly asks to skip / proceed.
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

    /** Saves the full chat history for a user to MinIO as a readable debug log. */
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
