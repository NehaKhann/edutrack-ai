package com.edutrack.chat.repository;

import com.edutrack.chat.entity.ChatParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatParticipantRepository extends JpaRepository<ChatParticipant, Long> {
    List<ChatParticipant> findByUserId(Long userId);
    List<ChatParticipant> findByConversationId(Long conversationId);
    Optional<ChatParticipant> findByConversationIdAndUserId(Long conversationId, Long userId);
}
