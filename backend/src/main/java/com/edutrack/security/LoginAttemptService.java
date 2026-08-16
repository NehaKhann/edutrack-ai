package com.edutrack.security;

import com.edutrack.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

/**
 * DB-backed brute-force throttle for /api/auth/login, tracked independently by email (stops repeated
 * guessing against one account) and by client IP (stops spraying many different emails from one
 * source) — same dual-key design as the original in-memory version. Moved off a per-instance
 * {@code ConcurrentHashMap} so a lockout survives a restart/redeploy and would stay correct if this
 * ever ran as more than one backend instance.
 */
@Component
@RequiredArgsConstructor
public class LoginAttemptService {

    private static final int MAX_ATTEMPTS = 6;
    private static final int LOCKOUT_MINUTES = 5;

    private final LoginAttemptRepository repository;

    @Transactional
    public void assertNotLocked(String email, String ip) {
        checkLocked("email:" + normalize(email));
        checkLocked("ip:" + ip);
    }

    @Transactional
    public void recordFailure(String email, String ip) {
        repository.recordFailure("email:" + normalize(email), MAX_ATTEMPTS, LOCKOUT_MINUTES);
        repository.recordFailure("ip:" + ip, MAX_ATTEMPTS, LOCKOUT_MINUTES);
    }

    @Transactional
    public void recordSuccess(String email, String ip) {
        repository.deleteByKey("email:" + normalize(email));
        repository.deleteByKey("ip:" + ip);
    }

    private void checkLocked(String key) {
        Optional<LoginAttempt> attempt = repository.findById(key);
        if (attempt.isEmpty() || attempt.get().getLockedUntil() == null) {
            return;
        }
        if (Instant.now().isBefore(attempt.get().getLockedUntil())) {
            throw ApiException.tooManyRequests("Too many failed login attempts. Please try again in a few minutes.");
        }
        repository.resetLock(key);
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
