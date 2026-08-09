package com.edutrack.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class JsonExtractionUtil {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JsonExtractionUtil() {
    }

    /**
     * LLMs frequently wrap JSON in markdown fences or add stray prose. This extracts the first
     * top-level JSON array or object found in the raw text and parses it, throwing if nothing
     * resembling JSON is found so callers can retry with a repair prompt.
     */
    public static JsonNode extractJson(String rawText) {
        String cleaned = rawText.strip();
        cleaned = cleaned.replaceAll("(?s)^```(?:json)?\\s*", "").replaceAll("(?s)```\\s*$", "");

        int arrayStart = cleaned.indexOf('[');
        int objectStart = cleaned.indexOf('{');
        int start;
        char open, close;
        if (arrayStart == -1 && objectStart == -1) {
            throw new IllegalArgumentException("No JSON found in LLM response");
        } else if (arrayStart == -1) {
            start = objectStart;
            open = '{';
            close = '}';
        } else if (objectStart == -1) {
            start = arrayStart;
            open = '[';
            close = ']';
        } else if (arrayStart < objectStart) {
            start = arrayStart;
            open = '[';
            close = ']';
        } else {
            start = objectStart;
            open = '{';
            close = '}';
        }

        int depth = 0;
        int end = -1;
        for (int i = start; i < cleaned.length(); i++) {
            char c = cleaned.charAt(i);
            if (c == open) depth++;
            else if (c == close) {
                depth--;
                if (depth == 0) {
                    end = i;
                    break;
                }
            }
        }
        if (end == -1) {
            throw new IllegalArgumentException("Unterminated JSON in LLM response");
        }

        String jsonSlice = cleaned.substring(start, end + 1);
        try {
            return MAPPER.readTree(jsonSlice);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Malformed JSON in LLM response: " + ex.getMessage(), ex);
        }
    }
}
