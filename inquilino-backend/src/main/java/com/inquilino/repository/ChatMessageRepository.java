package com.inquilino.repository;

import com.inquilino.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findByUserIdOrderByCreatedAtAsc(UUID userId);

    List<ChatMessage> findByUserIdAndStepOrderByCreatedAtAsc(UUID userId, String step);
}
