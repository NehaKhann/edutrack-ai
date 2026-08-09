package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import com.edutrack.llm.JsonExtractionUtil;
import com.edutrack.llm.LlmClient;
import com.edutrack.syllabus.dto.TopicResponse;
import com.edutrack.syllabus.entity.Syllabus;
import com.edutrack.syllabus.entity.Topic;
import com.edutrack.syllabus.repository.TopicRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TopicExtractionService {

    private static final Logger log = LoggerFactory.getLogger(TopicExtractionService.class);
    private static final int MAX_SYLLABUS_CHARS = 12_000;

    private static final String SYSTEM_PROMPT = """
            You are a curriculum planning assistant for a school. Given the raw text of a syllabus document,
            extract the list of topics it covers and map each one to the week(s) of the academic term it is
            planned for. Respond with ONLY a JSON array, no prose, no markdown code fences. Each array item
            must have this exact shape: {"title": string, "startWeek": integer, "endWeek": integer}.
            Weeks are 1-indexed from the first week of the term. Keep titles short and specific
            (e.g. "Fractions", "Photosynthesis", "The Mughal Empire"). Order the array chronologically by
            startWeek. If the document does not clearly state weeks, make a reasonable estimate by dividing
            the topics evenly across a typical 16-week term.
            """;

    private final LlmClient llmClient;
    private final TopicRepository topicRepository;

    @Transactional
    public List<TopicResponse> extractAndSave(Syllabus syllabus) {
        String syllabusExcerpt = syllabus.getRawExtractedText();
        if (syllabusExcerpt.length() > MAX_SYLLABUS_CHARS) {
            syllabusExcerpt = syllabusExcerpt.substring(0, MAX_SYLLABUS_CHARS);
        }
        String userPrompt = "Term: " + syllabus.getTerm() + "\n\nSyllabus text:\n" + syllabusExcerpt;

        JsonNode topicsJson = completeWithRetry(userPrompt);

        List<Topic> existing = topicRepository.findBySyllabusIdOrderByOrderIndexAsc(syllabus.getId());
        topicRepository.deleteAll(existing);

        List<Topic> topics = new ArrayList<>();
        int order = 0;
        int runningWeek = 1;
        for (JsonNode node : topicsJson) {
            String title = node.path("title").asText("").trim();
            if (title.isEmpty()) continue;

            int startWeek = node.path("startWeek").isInt() ? node.path("startWeek").asInt() : runningWeek;
            int endWeek = node.path("endWeek").isInt() ? node.path("endWeek").asInt() : startWeek;
            if (endWeek < startWeek) endWeek = startWeek;
            runningWeek = endWeek + 1;

            LocalDate start = syllabus.getTermStartDate().plusWeeks(startWeek - 1L);
            LocalDate end = syllabus.getTermStartDate().plusWeeks(endWeek).minusDays(1);

            Topic topic = new Topic(syllabus, title, startWeek, endWeek, start, end, order++);
            topics.add(topic);
        }

        if (topics.isEmpty()) {
            throw ApiException.badRequest("The AI could not identify any topics in this document. Try a clearer syllabus PDF, or add topics manually.");
        }

        return topicRepository.saveAll(topics).stream().map(TopicResponse::from).toList();
    }

    private JsonNode completeWithRetry(String userPrompt) {
        String raw = llmClient.complete(SYSTEM_PROMPT, userPrompt);
        try {
            JsonNode parsed = JsonExtractionUtil.extractJson(raw);
            if (parsed.isArray()) return parsed;
            throw new IllegalArgumentException("Expected a JSON array");
        } catch (IllegalArgumentException firstFailure) {
            log.warn("Topic extraction JSON parse failed, retrying with a repair prompt: {}", firstFailure.getMessage());
            String repairPrompt = userPrompt + "\n\nYour previous response was not valid JSON. Return ONLY a valid JSON array matching the schema described, with no other text.";
            String repaired = llmClient.complete(SYSTEM_PROMPT, repairPrompt);
            JsonNode parsed = JsonExtractionUtil.extractJson(repaired);
            if (!parsed.isArray()) {
                throw ApiException.internal("The AI returned an unexpected response format. Please try again or add topics manually.");
            }
            return parsed;
        }
    }
}
