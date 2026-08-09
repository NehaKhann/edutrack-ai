package com.edutrack.llm;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class LlmConfig {

    @Bean
    public LlmClient llmClient(LlmProperties properties) {
        if ("groq".equalsIgnoreCase(properties.getProvider())) {
            return new GroqLlmClient(properties);
        }
        return new OllamaLlmClient(properties);
    }
}
