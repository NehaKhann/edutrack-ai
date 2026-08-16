package com.edutrack.config;

import com.edutrack.security.StompAuthChannelInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Push-only channel for chat + notifications, layered on top of the existing REST API — clients only
 * ever SUBSCRIBE here (to their own {@code /user/queue/...} destinations); every write still goes
 * through the normal REST endpoints unchanged. See {@link StompAuthChannelInterceptor} for how the
 * existing JWT auth is reused on CONNECT, and why everything is routed through per-user queues rather
 * than a shared per-conversation topic (Spring's simple broker doesn't authorize SUBSCRIBE frames).
 *
 * Uses Spring's in-memory simple broker — fine for Render's single backend instance today, but a
 * message published from one instance won't reach a socket connected to another if this is ever scaled
 * horizontally (would need a broker relay such as Redis/RabbitMQ to fix).
 */
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @Value("${cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns(allowedOrigins.split(","));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/queue");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthChannelInterceptor);
    }
}
