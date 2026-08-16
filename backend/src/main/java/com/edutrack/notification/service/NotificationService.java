package com.edutrack.notification.service;

import com.edutrack.notification.dto.NotificationResponse;
import com.edutrack.notification.entity.Notification;
import com.edutrack.notification.repository.NotificationRepository;
import com.edutrack.org.entity.User;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void notify(User recipient, String message) {
        push(notificationRepository.save(new Notification(recipient, message)));
    }

    @Transactional
    public void notify(User recipient, String message, String link) {
        push(notificationRepository.save(new Notification(recipient, message, link)));
    }

    /** Pushes the just-created notification straight to the recipient's bell — polling stays as a fallback for when they're not connected. */
    private void push(Notification saved) {
        messagingTemplate.convertAndSendToUser(saved.getRecipient().getEmail(), "/queue/notifications", NotificationResponse.from(saved));
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> listMine() {
        Long userId = CurrentUser.get().getUserId();
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return notificationRepository.countByRecipientIdAndReadFalse(CurrentUser.get().getUserId());
    }

    @Transactional
    public void markAllRead() {
        Long userId = CurrentUser.get().getUserId();
        List<Notification> unread = notificationRepository.findByRecipientIdAndReadFalse(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    /** Called when the user opens a notification — it should not appear in the list again. */
    @Transactional
    public void dismiss(Long id) {
        Long userId = CurrentUser.get().getUserId();
        notificationRepository.findById(id)
                .filter(n -> n.getRecipient().getId().equals(userId))
                .ifPresent(notificationRepository::delete);
    }

    /** Clears every notification for the current user — the "Clear all" action in the bell dropdown. */
    @Transactional
    public void dismissAll() {
        Long userId = CurrentUser.get().getUserId();
        notificationRepository.deleteAll(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId));
    }

    /**
     * Clears every outstanding notification whose deep link contains the given fragment, for every
     * recipient that has one — used to retract a "request awaiting review" style notification once the
     * underlying request has actually been resolved, so it doesn't linger for anyone once it's stale.
     */
    @Transactional
    public void retractByLinkFragment(String fragment) {
        notificationRepository.deleteAll(notificationRepository.findByLinkContaining(fragment));
    }
}
