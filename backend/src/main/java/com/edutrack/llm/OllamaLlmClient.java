package com.edutrack.llm;

import com.edutrack.common.ApiException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

public class OllamaLlmClient implements LlmClient {

    private static final Logger log = LoggerFactory.getLogger(OllamaLlmClient.class);

    private final WebClient webClient;
    private final LlmProperties.Ollama config;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OllamaLlmClient(LlmProperties properties) {
        this.config = properties.getOllama();
        HttpClient httpClient = HttpClient.create().responseTimeout(Duration.ofSeconds(120));
        this.webClient = WebClient.builder()
                .baseUrl(config.getBaseUrl())
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .build();
    }

    @Override
    public String complete(String systemPrompt, String userPrompt) {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", config.getModel());
        body.put("stream", false);
        ArrayNode messages = body.putArray("messages");
        messages.add(objectMapper.createObjectNode().put("role", "system").put("content", systemPrompt));
        messages.add(objectMapper.createObjectNode().put("role", "user").put("content", userPrompt));

        try {
            JsonNode response = webClient.post()
                    .uri("/api/chat")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            return response.at("/message/content").asText();
        } catch (Exception ex) {
            log.error("Ollama completion failed", ex);
            throw ApiException.internal(
                    "The local AI model (Ollama) is unavailable. Make sure `ollama serve` is running and the model is pulled ("
                            + config.getModel() + "). Details: " + ex.getMessage());
        }
    }

    @Override
    public String providerName() {
        return "ollama";
    }
}
