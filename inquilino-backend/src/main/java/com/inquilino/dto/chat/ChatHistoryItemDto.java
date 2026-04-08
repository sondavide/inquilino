package com.inquilino.dto.chat;

public record ChatHistoryItemDto(
        String id,
        String role,
        String content,
        String createdAt
) {}
