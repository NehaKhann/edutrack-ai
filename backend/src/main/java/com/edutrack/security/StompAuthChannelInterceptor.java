package com.edutrack.security;

import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Authenticates the WebSocket STOMP CONNECT frame using the same JWT the REST API already accepts —
 * browsers can't set a custom Authorization header on the WS handshake itself, so the token travels as
 * a native STOMP header on CONNECT instead. Mirrors {@link JwtAuthFilter} exactly (parse, re-check the
 * user is still active in the DB, build an {@link AuthenticatedUser}) rather than sharing code with it,
 * to avoid touching a working security-critical filter for a single extra caller.
 */
@Component
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        // MessageHeaderAccessor.getAccessor (not StompHeaderAccessor.wrap) retrieves the *same* mutable
        // accessor already attached to this inbound message — mutating a fresh wrap() copy wouldn't
        // propagate, since we return the original `message` unchanged below.
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ")) {
                throw new AuthenticationCredentialsNotFoundException("Missing bearer token");
            }
            String token = header.substring(7);
            try {
                Claims claims = jwtService.parseClaims(token);
                Long userId = claims.get("userId", Long.class);
                Optional<User> current = userRepository.findById(userId).filter(User::isActive);
                if (current.isEmpty()) {
                    throw new AuthenticationCredentialsNotFoundException("User not found or inactive");
                }
                AuthenticatedUser authenticatedUser = new AuthenticatedUser(
                        userId,
                        claims.get("schoolId", Long.class),
                        claims.getSubject(),
                        "",
                        Role.valueOf(claims.get("role", String.class)),
                        claims.get("name", String.class),
                        true
                );
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(authenticatedUser, null, authenticatedUser.getAuthorities());
                accessor.setUser(authentication);
            } catch (JwtException | IllegalArgumentException ex) {
                throw new AuthenticationCredentialsNotFoundException("Invalid token", ex);
            }
        }
        return message;
    }
}
