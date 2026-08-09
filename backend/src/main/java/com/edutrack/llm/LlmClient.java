package com.edutrack.llm;

public interface LlmClient {

    /**
     * Sends a system+user prompt to the configured LLM provider and returns the raw text response.
     * Callers that expect structured output should instruct the model (via the prompt) to return
     * JSON only, and parse defensively via {@link JsonExtractionUtil}.
     */
    String complete(String systemPrompt, String userPrompt);

    String providerName();
}
