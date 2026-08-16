package com.edutrack.chat.repository;

import com.edutrack.chat.entity.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, Long> {

    @Query("SELECT c FROM ChatConversation c WHERE c.type = com.edutrack.chat.entity.ConversationType.DIRECT " +
            "AND c.school.id = :schoolId " +
            "AND c.id IN (SELECT p.conversation.id FROM ChatParticipant p WHERE p.user.id = :userA) " +
            "AND c.id IN (SELECT p.conversation.id FROM ChatParticipant p WHERE p.user.id = :userB)")
    Optional<ChatConversation> findDirectBetween(@Param("schoolId") Long schoolId, @Param("userA") Long userA, @Param("userB") Long userB);
}
