package com.inquilino.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inquilino.dto.document.DocumentUploadResponse;
import com.inquilino.entity.Document;
import com.inquilino.entity.User;
import com.inquilino.enums.DocumentType;
import com.inquilino.repository.DocumentRepository;
import com.inquilino.repository.OnboardingStateRepository;
import com.inquilino.security.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.content.Media;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeType;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final S3Client s3Client;
    private final ChatClient chatClient;
    private final DocumentRepository documentRepository;
    private final OnboardingStateRepository onboardingStateRepository;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    @Value("${minio.bucket}")
    private String bucket;

    @Value("${minio.endpoint}")
    private String minioEndpoint;

    public DocumentUploadResponse uploadAndVerify(UUID userId, MultipartFile file, DocumentType type) {
        User user = userService.findById(userId);

        // 1. Upload to MinIO
        String fileKey = "%s/%s/%d_%s".formatted(
                userId, type.name().toLowerCase(),
                System.currentTimeMillis(),
                sanitize(file.getOriginalFilename()));

        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket).key(fileKey)
                            .contentType(file.getContentType()).build(),
                    RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file", e);
        }

        String fileUrl = "%s/%s/%s".formatted(minioEndpoint, bucket, fileKey);

        // 2. Quick verification (images only; PDFs get a pass-through)
        VerificationResult verification = isImage(file.getContentType())
                ? verifyWithGpt4o(file, type)
                : new VerificationResult(true, "PDF received — detailed review pending");

        // 3. Persist document entity
        Document doc = Document.builder()
                .user(user).type(type).fileUrl(fileUrl).verified(false)
                .extractedData(Map.of(
                        "quick_check_passed", verification.passed(),
                        "quick_check_note",   verification.note()))
                .build();
        doc = documentRepository.save(doc);

        // 4. Mark document as uploaded in onboarding state
        markUploadedInState(userId, type, verification.passed(), verification.note());

        return new DocumentUploadResponse(doc.getId(), verification.passed(), verification.note(), fileUrl);
    }

    public List<Document> findByUserId(UUID userId) {
        return documentRepository.findByUserId(userId);
    }

    // ─── Private ─────────────────────────────────────────────────────────────────

    private VerificationResult verifyWithGpt4o(MultipartFile file, DocumentType type) {
        try {
            String prompt = """
                    Is this image a valid %s document?
                    Reply ONLY with JSON: {"isCorrectType": true/false, "note": "one sentence explanation"}
                    """.formatted(type.name().replace("_", " ").toLowerCase());

            Media media = new Media(
                    MimeType.valueOf(Objects.requireNonNull(file.getContentType())),
                    new ByteArrayResource(file.getBytes()));

            UserMessage message = UserMessage.builder()
                    .text(prompt)
                    .media(media)
                    .build();

            String response = chatClient.prompt()
                    .messages(List.of(message))
                    .call()
                    .content();

            String json = response.replaceAll("(?s)```json\\s*(.*?)\\s*```", "$1").trim();
            Map<String, Object> result = objectMapper.readValue(json, new TypeReference<>() {});
            boolean passed = Boolean.TRUE.equals(result.get("isCorrectType"));
            String note = String.valueOf(result.getOrDefault("note", ""));
            return new VerificationResult(passed, note);

        } catch (Exception e) {
            log.warn("GPT-4o document verification failed: {}", e.getMessage());
            return new VerificationResult(true, "Automatic verification unavailable — manual review pending");
        }
    }

    private void markUploadedInState(UUID userId, DocumentType type, boolean passed, String note) {
        onboardingStateRepository.findByUserId(userId).ifPresent(state -> {
            // Create a new map so Hibernate detects the change (in-place mutations on
            // @JdbcTypeCode(JSON) maps are not detected as dirty by ImmutableMutabilityPlan)
            Map<String, Object> data = new HashMap<>(
                    state.getCollectedData() != null ? state.getCollectedData() : new HashMap<>());
            String prefix = type.name().toLowerCase();
            data.put(prefix + "_uploaded", true);
            data.put(prefix + "_verified", passed);
            if (note != null && !note.isBlank()) {
                data.put(prefix + "_verification_note", note);
            }
            state.setCollectedData(data);
            onboardingStateRepository.save(state);
        });
    }

    private boolean isImage(String contentType) {
        return contentType != null && contentType.startsWith("image/");
    }

    private String sanitize(String filename) {
        return filename == null ? "file" : filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private record VerificationResult(boolean passed, String note) {}
}
