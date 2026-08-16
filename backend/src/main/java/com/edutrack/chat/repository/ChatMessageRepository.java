package com.edutrack.chat.repository;

import com.edutrack.chat.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    Optional<ChatMessage> findFirstByConversationIdOrderByCreatedAtDesc(Long conversationId);

    List<ChatMessage> findByConversationIdAndCreatedAtLessThanOrderByCreatedAtDesc(
            Long conversationId, Instant before, Pageable pageable);

    List<ChatMessage> findByConversationIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(
            Long conversationId, Instant after);

    long countByConversationIdAndCreatedAtGreaterThanAndSenderIdNot(
            Long conversationId, Instant after, Long senderId);
}
