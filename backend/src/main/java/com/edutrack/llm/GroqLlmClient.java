package com.edutrack.llm;

import com.edutrack.common.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

public class GroqLlmClient implements LlmClient {

    private static final Logger log = LoggerFactory.getLogger(GroqLlmClient.class);

    private final WebClient webClient;
    private final LlmProperties.Groq config;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GroqLlmClient(LlmProperties properties) {
        this.config = properties.getGroq();
        HttpClient httpClient = HttpClient.create().responseTimeout(Duration.ofSeconds(60));
        this.webClient = WebClient.builder()
                .baseUrl(config.getBaseUrl())
                .clientConnector(new org.springframework.http.client.reactive.ReactorClientHttpConnector(httpClient))
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + config.getApiKey())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public String complete(String systemPrompt, String userPrompt) {
        if (config.getApiKey() == null || config.getApiKey().isBlank()) {
            throw ApiException.internal("GROQ_API_KEY is not configured. Set LLM_PROVIDER=ollama for local dev, or provide a Groq API key.");
        }

        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", config.getModel());
        body.put("temperature", 0.4);
        ArrayNode messages = body.putArray("messages");
        messages.add(objectMapper.createObjectNode().put("role", "system").put("content", systemPrompt));
        messages.add(objectMapper.createObjectNode().put("role", "user").put("content", userPrompt));

        try {
            JsonNode response = webClient.post()
                    .uri("/chat/completions")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            return response.at("/choices/0/message/content").asText();
        } catch (Exception ex) {
            log.error("Groq completion failed", ex);
            throw ApiException.internal("The AI service (Groq) is unavailable right now: " + ex.getMessage());
        }
    }

    @Override
    public String providerName() {
        return "groq";
    }
}
