package com.edutrack.chat.service;

import com.edutrack.chat.dto.ContactResponse;
import com.edutrack.chat.dto.ConversationResponse;
import com.edutrack.chat.dto.MessageListResponse;
import com.edutrack.chat.dto.MessageResponse;
import com.edutrack.chat.entity.ChatConversation;
import com.edutrack.chat.entity.ChatMessage;
import com.edutrack.chat.entity.ChatMessageType;
import com.edutrack.chat.entity.ChatParticipant;
import com.edutrack.chat.entity.ConversationType;
import com.edutrack.chat.repository.ChatConversationRepository;
import com.edutrack.chat.repository.ChatMessageRepository;
import com.edutrack.chat.repository.ChatParticipantRepository;
import com.edutrack.common.ApiException;
import com.edutrack.notification.service.NotificationService;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.storage.FileStorageService;
import com.edutrack.storage.UploadGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ChatService {

    private static final int DEFAULT_PAGE_SIZE = 50;

    private final ChatConversationRepository conversationRepository;
    private final ChatParticipantRepository participantRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional(readOnly = true)
    public List<ContactResponse> listContacts() {
        AuthenticatedUser me = CurrentUser.get();
        return userRepository.findBySchoolIdAndActiveTrueAndIdNot(me.getSchoolId(), me.getUserId()).stream()
                .sorted(Comparator.comparing(User::getName))
                .map(ContactResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConversationResponse> listConversations() {
        AuthenticatedUser me = CurrentUser.get();
        List<ChatParticipant> mine = participantRepository.findByUserId(me.getUserId());
        return mine.stream()
                .map(p -> buildConversationResponse(p.getConversation(), me.getUserId()))
                .sorted(Comparator.comparing(
                        (ConversationResponse c) -> c.lastMessageAt() != null ? c.lastMessageAt() : Instant.EPOCH
                ).reversed())
                .toList();
    }

    @Transactional
    public ConversationResponse startDirect(Long otherUserId) {
        AuthenticatedUser me = CurrentUser.get();
        if (otherUserId.equals(me.getUserId())) {
            throw ApiException.badRequest("Cannot start a chat with yourself");
        }
        User other = userRepository.findById(otherUserId)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        if (!other.getSchool().getId().equals(me.getSchoolId()) || !other.isActive()) {
            throw ApiException.notFound("User not found");
        }

        ChatConversation conversation = conversationRepository
                .findDirectBetween(me.getSchoolId(), me.getUserId(), otherUserId)
                .orElseGet(() -> {
                    User meEntity = userRepository.findById(me.getUserId()).orElseThrow();
                    ChatConversation created = conversationRepository.save(
                            new ChatConversation(ConversationType.DIRECT, null, meEntity.getSchool(), meEntity));
                    participantRepository.save(new ChatParticipant(created, meEntity));
                    participantRepository.save(new ChatParticipant(created, other));
                    return created;
                });

        return buildConversationResponse(conversation, me.getUserId());
    }

    @Transactional
    public ConversationResponse createGroup(String name, List<Long> participantIds) {
        AuthenticatedUser me = CurrentUser.get();
        User meEntity = userRepository.findById(me.getUserId()).orElseThrow();

        Set<Long> ids = new LinkedHashSet<>(participantIds);
        ids.remove(me.getUserId());
        if (ids.isEmpty()) {
            throw ApiException.badRequest("Add at least one other participant");
        }

        List<User> others = userRepository.findAllById(ids);
        if (others.size() != ids.size()) {
            throw ApiException.badRequest("One or more selected participants could not be found");
        }
        for (User other : others) {
            if (!other.getSchool().getId().equals(me.getSchoolId()) || !other.isActive()) {
                throw ApiException.badRequest("One or more selected participants are not available");
            }
        }

        ChatConversation conversation = conversationRepository.save(
                new ChatConversation(ConversationType.GROUP, name, meEntity.getSchool(), meEntity));
        participantRepository.save(new ChatParticipant(conversation, meEntity));
        for (User other : others) {
            participantRepository.save(new ChatParticipant(conversation, other));
        }

        return buildConversationResponse(conversation, me.getUserId());
    }

    @Transactional(readOnly = true)
    public MessageListResponse getMessages(Long conversationId, Instant before, Integer limit) {
        requireParticipant(conversationId);
        Instant cutoff = before != null ? before : Instant.now();
        Pageable pageable = PageRequest.of(0, limit != null && limit > 0 ? limit : DEFAULT_PAGE_SIZE);
        List<ChatMessage> page = messageRepository
                .findByConversationIdAndCreatedAtLessThanOrderByCreatedAtDesc(conversationId, cutoff, pageable);
        List<MessageResponse> result = page.stream().map(MessageResponse::from).collect(java.util.stream.Collectors.toCollection(ArrayList::new));
        Collections.reverse(result);
        return new MessageListResponse(result, computeReadThroughAt(conversationId, CurrentUser.get().getUserId()));
    }

    @Transactional(readOnly = true)
    public MessageListResponse getNewMessages(Long conversationId, Instant after) {
        requireParticipant(conversationId);
        Instant since = after != null ? after : Instant.EPOCH;
        List<MessageResponse> result = messageRepository
                .findByConversationIdAndCreatedAtGreaterThanOrderByCreatedAtAsc(conversationId, since)
                .stream().map(MessageResponse::from).toList();
        return new MessageListResponse(result, computeReadThroughAt(conversationId, CurrentUser.get().getUserId()));
    }

    /** The point in time up to which every other participant has read this conversation — null if any of them hasn't opened it at all. */
    private Instant computeReadThroughAt(Long conversationId, Long myUserId) {
        List<ChatParticipant> others = participantRepository.findByConversationId(conversationId).stream()
                .filter(p -> !p.getUser().getId().equals(myUserId))
                .toList();
        if (others.isEmpty()) return null;
        Instant min = null;
        for (ChatParticipant p : others) {
            if (p.getLastReadAt() == null) return null;
            if (min == null || p.getLastReadAt().isBefore(min)) min = p.getLastReadAt();
        }
        return min;
    }

    @Transactional
    public MessageResponse sendMessage(Long conversationId, ChatMessageType type, String content,
                                        MultipartFile file, Integer durationSeconds) {
        ChatParticipant participant = requireParticipant(conversationId);
        AuthenticatedUser me = CurrentUser.get();
        User sender = userRepository.findById(me.getUserId()).orElseThrow();

        if (type == ChatMessageType.TEXT && (content == null || content.isBlank())) {
            throw ApiException.badRequest("Message text cannot be empty");
        }
        if (type != ChatMessageType.TEXT && (file == null || file.isEmpty())) {
            throw ApiException.badRequest("A file is required for this message type");
        }

        ChatMessage message = new ChatMessage(participant.getConversation(), sender, type, content);
        if (file != null && !file.isEmpty()) {
            UploadGuard.assertSafe(file);
            message.setFileRef(fileStorageService.store(file, "chat"));
            message.setFileName(file.getOriginalFilename());
            message.setFileSize(file.getSize());
            message.setMimeType(file.getContentType());
        }
        if (type == ChatMessageType.VOICE) {
            message.setDurationSeconds(durationSeconds);
        }

        ChatMessage saved = messageRepository.save(message);

        participant.setLastReadAt(Instant.now());
        participantRepository.save(participant);

        notifyOtherParticipants(participant.getConversation(), sender, saved);

        return MessageResponse.from(saved);
    }

    /**
     * Pushes the new message live to every other participant (regardless of unread count — that gating
     * only applies to the notification-center entry below, not the chat itself) and, only when this is
     * the first unread message they have in the conversation, also creates a notification-center entry —
     * otherwise a rapid back-and-forth would create one notification per message.
     */
    private void notifyOtherParticipants(ChatConversation conversation, User sender, ChatMessage saved) {
        String preview = previewFor(saved);
        String text = conversation.getType() == ConversationType.GROUP
                ? sender.getName() + " in " + conversation.getName() + ": " + preview
                : "New message from " + sender.getName() + ": " + preview;
        String link = "/chat?conversationId=" + conversation.getId();
        MessageResponse messageResponse = MessageResponse.from(saved);

        for (ChatParticipant p : participantRepository.findByConversationId(conversation.getId())) {
            if (p.getUser().getId().equals(sender.getId())) continue;

            messagingTemplate.convertAndSendToUser(p.getUser().getEmail(), "/queue/chat-messages", messageResponse);
            messagingTemplate.convertAndSendToUser(
                    p.getUser().getEmail(), "/queue/chat-updates", buildConversationResponse(conversation, p.getUser().getId()));

            Instant after = p.getLastReadAt() != null ? p.getLastReadAt() : Instant.EPOCH;
            long unread = messageRepository.countByConversationIdAndCreatedAtGreaterThanAndSenderIdNot(
                    conversation.getId(), after, p.getUser().getId());
            if (unread <= 1) {
                notificationService.notify(p.getUser(), text, link);
            }
        }
    }

    private String previewFor(ChatMessage m) {
        if (m.getType() != ChatMessageType.TEXT && m.getContent() != null && !m.getContent().isBlank()) {
            return m.getContent();
        }
        return switch (m.getType()) {
            case TEXT -> m.getContent();
            case IMAGE -> "Photo";
            case DOCUMENT -> m.getMimeType() != null && m.getMimeType().startsWith("video/") ? "Video" : "Document";
            case VOICE -> "Voice message";
        };
    }

    @Transactional
    public void markRead(Long conversationId) {
        ChatParticipant participant = requireParticipant(conversationId);
        participant.setLastReadAt(Instant.now());
        participantRepository.save(participant);
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        Long myId = CurrentUser.get().getUserId();
        long total = 0;
        for (ChatParticipant p : participantRepository.findByUserId(myId)) {
            Instant after = p.getLastReadAt() != null ? p.getLastReadAt() : Instant.EPOCH;
            total += messageRepository.countByConversationIdAndCreatedAtGreaterThanAndSenderIdNot(
                    p.getConversation().getId(), after, myId);
        }
        return total;
    }

    @Transactional(readOnly = true)
    public byte[] getFileBytes(Long messageId) {
        ChatMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> ApiException.notFound("Message not found"));
        requireParticipant(message.getConversation().getId());
        if (message.getFileRef() == null) {
            throw ApiException.notFound("This message has no attachment");
        }
        return fileStorageService.load(message.getFileRef());
    }

    @Transactional(readOnly = true)
    public String getFileName(Long messageId) {
        return messageRepository.findById(messageId)
                .map(ChatMessage::getFileName)
                .orElse("file");
    }

    private ChatParticipant requireParticipant(Long conversationId) {
        Long myId = CurrentUser.get().getUserId();
        return participantRepository.findByConversationIdAndUserId(conversationId, myId)
                .orElseThrow(() -> ApiException.notFound("Conversation not found"));
    }

    private ConversationResponse buildConversationResponse(ChatConversation conversation, Long myUserId) {
        List<ChatParticipant> participants = participantRepository.findByConversationId(conversation.getId());
        ChatParticipant mine = participants.stream()
                .filter(p -> p.getUser().getId().equals(myUserId))
                .findFirst()
                .orElseThrow(() -> ApiException.notFound("Conversation not found"));

        String displayName;
        Long otherUserId = null;
        if (conversation.getType() == ConversationType.GROUP) {
            displayName = conversation.getName();
        } else {
            ChatParticipant other = participants.stream()
                    .filter(p -> !p.getUser().getId().equals(myUserId))
                    .findFirst()
                    .orElse(null);
            displayName = other != null ? other.getUser().getName() : "Deleted user";
            otherUserId = other != null ? other.getUser().getId() : null;
        }

        ChatMessage last = messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(conversation.getId()).orElse(null);
        String preview = null;
        String lastMessageType = null;
        Instant lastMessageAt = null;
        if (last != null) {
            lastMessageType = last.getType().name();
            lastMessageAt = last.getCreatedAt();
            preview = previewFor(last);
        }

        Instant after = mine.getLastReadAt() != null ? mine.getLastReadAt() : Instant.EPOCH;
        long unread = messageRepository.countByConversationIdAndCreatedAtGreaterThanAndSenderIdNot(
                conversation.getId(), after, myUserId);

        return new ConversationResponse(
                conversation.getId(), conversation.getType().name(), displayName, otherUserId,
                preview, lastMessageType, lastMessageAt, unread
        );
    }
}
