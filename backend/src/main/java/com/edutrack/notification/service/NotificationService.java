package com.edutrack.notification.service;

import com.edutrack.notification.dto.NotificationResponse;
import com.edutrack.notification.entity.Notification;
import com.edutrack.notification.repository.NotificationRepository;
import com.edutrack.org.entity.User;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional
    public void notify(User recipient, String message) {
        notificationRepository.save(new Notification(recipient, message));
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
}
