package com.inquilino.dto.document;

import java.util.UUID;

public record DocumentUploadResponse(
        UUID documentId,
        boolean quickVerificationPassed,
        String verificationNote,
        String fileUrl
) {}
