package com.edutrack.chat.controller;

import com.edutrack.chat.dto.ContactResponse;
import com.edutrack.chat.dto.ConversationResponse;
import com.edutrack.chat.dto.CreateGroupRequest;
import com.edutrack.chat.dto.MessageListResponse;
import com.edutrack.chat.dto.MessageResponse;
import com.edutrack.chat.dto.StartDirectRequest;
import com.edutrack.chat.entity.ChatMessageType;
import com.edutrack.chat.service.ChatService;
import com.edutrack.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @GetMapping("/contacts")
    public ApiResponse<List<ContactResponse>> contacts() {
        return ApiResponse.ok(chatService.listContacts());
    }

    @GetMapping("/conversations")
    public ApiResponse<List<ConversationResponse>> conversations() {
        return ApiResponse.ok(chatService.listConversations());
    }

    @PostMapping("/conversations/direct")
    public ApiResponse<ConversationResponse> startDirect(@Valid @RequestBody StartDirectRequest request) {
        return ApiResponse.ok(chatService.startDirect(request.userId()));
    }

    @PostMapping("/conversations/group")
    public ApiResponse<ConversationResponse> createGroup(@Valid @RequestBody CreateGroupRequest request) {
        return ApiResponse.ok(chatService.createGroup(request.name(), request.participantIds()));
    }

    @GetMapping("/conversations/{id}/messages")
    public ApiResponse<MessageListResponse> messages(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant before,
            @RequestParam(required = false) Integer limit) {
        return ApiResponse.ok(chatService.getMessages(id, before, limit));
    }

    @GetMapping("/conversations/{id}/messages/new")
    public ApiResponse<MessageListResponse> newMessages(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant after) {
        return ApiResponse.ok(chatService.getNewMessages(id, after));
    }

    @PostMapping(value = "/conversations/{id}/messages", consumes = "multipart/form-data")
    public ApiResponse<MessageResponse> sendMessage(
            @PathVariable Long id,
            @RequestParam ChatMessageType type,
            @RequestParam(required = false) String content,
            @RequestParam(required = false) MultipartFile file,
            @RequestParam(required = false) Integer durationSeconds) {
        return ApiResponse.ok(chatService.sendMessage(id, type, content, file, durationSeconds));
    }

    @PostMapping("/conversations/{id}/read")
    public ApiResponse<Void> markRead(@PathVariable Long id) {
        chatService.markRead(id);
        return ApiResponse.ok(null);
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unreadCount() {
        return ApiResponse.ok(Map.of("count", chatService.unreadCount()));
    }

    @GetMapping("/files/{messageId}")
    public ResponseEntity<byte[]> file(@PathVariable Long messageId) {
        byte[] bytes = chatService.getFileBytes(messageId);
        String filename = chatService.getFileName(messageId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + sanitize(filename) + "\"")
                .body(bytes);
    }

    private String sanitize(String filename) {
        return filename == null ? "file" : filename.replaceAll("[\\r\\n\"]", "_");
    }
}
