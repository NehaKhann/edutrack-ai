package com.edutrack.security;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, String> {

    /** Single round-trip upsert — avoids a read-then-write race between concurrent failed logins for the same key. */
    @Modifying
    @Query(value = """
            INSERT INTO login_attempt (attempt_key, failures, locked_until, updated_at)
            VALUES (:key, 1, NULL, now())
            ON CONFLICT (attempt_key) DO UPDATE SET
                failures = login_attempt.failures + 1,
                locked_until = CASE WHEN login_attempt.failures + 1 >= :maxAttempts
                    THEN now() + make_interval(mins => :lockoutMinutes)
                    ELSE login_attempt.locked_until END,
                updated_at = now()
            """, nativeQuery = true)
    void recordFailure(@Param("key") String key, @Param("maxAttempts") int maxAttempts, @Param("lockoutMinutes") int lockoutMinutes);

    @Modifying
    @Query("UPDATE LoginAttempt l SET l.failures = 0, l.lockedUntil = null, l.updatedAt = CURRENT_TIMESTAMP WHERE l.attemptKey = :key")
    void resetLock(@Param("key") String key);

    @Modifying
    @Query("DELETE FROM LoginAttempt l WHERE l.attemptKey = :key")
    void deleteByKey(@Param("key") String key);
}
