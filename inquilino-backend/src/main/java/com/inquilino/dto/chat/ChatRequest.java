package com.inquilino.dto.chat;

import lombok.Data;

@Data
public class ChatRequest {
    private String content; // null or blank = init call
}
