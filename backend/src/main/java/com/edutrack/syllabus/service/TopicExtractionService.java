package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import com.edutrack.llm.JsonExtractionUtil;
import com.edutrack.llm.LlmClient;
import com.edutrack.syllabus.dto.TopicExtractionResult;
import com.edutrack.syllabus.dto.TopicResponse;
import com.edutrack.syllabus.entity.Syllabus;
import com.edutrack.syllabus.entity.SyllabusDocument;
import com.edutrack.syllabus.entity.Topic;
import com.edutrack.syllabus.repository.SyllabusDocumentRepository;
import com.edutrack.syllabus.repository.TopicRepository;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TopicExtractionService {

    private static final Logger log = LoggerFactory.getLogger(TopicExtractionService.class);
    private static final int MAX_SYLLABUS_CHARS = 12_000;

    /**
     * If a topic's startWeek jumps further ahead of the previous topic's endWeek than this, or exceeds
     * ABSOLUTE_MAX_WEEK outright, it's almost certainly a mis-parse (e.g. OCR/LLM turning "2-3" into "23")
     * rather than a real gap in a single school term, so we clamp it back to a sane value instead of
     * silently trusting it.
     */
    private static final int MAX_REASONABLE_WEEK_JUMP = 8;
    private static final int ABSOLUTE_MAX_WEEK = 52;

    /** A month more than this many calendar months from the term start is almost certainly a mis-parsed year. */
    private static final int MAX_REASONABLE_MONTH_DISTANCE = 24;

    private static final String SYSTEM_PROMPT = """
            You are a curriculum planning assistant for a school. Given the raw text of a syllabus document
            (it may come from OCR and contain noise, typos, or garbled characters), extract the list of
            topics it covers and map each one to when in the academic term it is planned. Respond with ONLY
            a JSON array, no prose, no markdown code fences. Each array item must have this exact shape:
            {"title": string, "startWeek": integer or null, "endWeek": integer or null, "month": string or null}

            Use exactly one of these two timing styles per item, matching however the SOURCE document
            organizes it:
            - WEEK-based: if the document says things like "Week 1-2" or "Week 5", set startWeek/endWeek
              (1-indexed from the first week of the term) and leave "month" null.
            - MONTH-based: if the document organizes content under month headings (e.g. "Month of April
              2026", "April'26", or an Urdu month heading like "ماہ اگست" meaning "Month of August"), set
              "month" to that month in "YYYY-MM" format (e.g. "2026-04") and leave startWeek/endWeek null.
              Infer the year from the term/academic-year context given below — for a syllabus spanning two
              calendar years (e.g. "2026-2027"), months from roughly April through December usually belong
              to the first year and January through March to the second.
              This style is COMMON — most real school syllabi are organized by month, not week. Do not
              default to week-based just because it seems simpler; look at how the SOURCE text actually
              labels its sections.
              Example: the line "August'26 - Chapter 6: [Some Chapter Title]" (inside a "2026-2027" academic
              year) must become {"title": "[Some Chapter Title]", "startWeek": null, "endWeek": null,
              "month": "2026-08"} — never invent week numbers for a document that names months.

            Keep titles short and specific — a few words naming the actual concept (not a generic label like
            "Chapter 3" or "Unit 2"), and skip generic filler like "Revision", "Mental Maths Drill", or
            exam-logistics text unless it is itself a real topic. Order the array chronologically. The
            document may be in English, Urdu, or a mix of both — extract topic titles in whichever language
            the source uses, do not translate them. If timing is not clearly stated anywhere, make a
            reasonable week-based estimate across a typical 16-week term.

            CRITICAL: every title you output must be something that actually appears in the syllabus text
            given below. Never invent a topic, and never reuse any example title shown in these instructions
            (like "[Some Chapter Title]") literally — those are placeholders, not real answers. If the text
            is too garbled to identify any real topics, return an empty JSON array [] rather than guessing.

            IMPORTANT: a hyphenated or en-dash range like "Week 2-3" or "Week 2–3" means startWeek=2 and
            endWeek=3 (two separate numbers spanning a range) — it does NOT mean the single number 23.
            Example: "Week 5-6: [Some Topic Title]" must become {"title": "[Some Topic Title]", "startWeek": 5,
            "endWeek": 6, "month": null}, never startWeek/endWeek 56.
            """;

    private final LlmClient llmClient;
    private final TopicRepository topicRepository;
    private final SyllabusDocumentRepository syllabusDocumentRepository;

    @Transactional
    public TopicExtractionResult extractAndSave(Syllabus syllabus) {
        if (!syllabus.isConfirmed()) {
            throw ApiException.badRequest("Please confirm the syllabus content before generating a plan.");
        }

        List<SyllabusDocument> documents = syllabusDocumentRepository.findBySyllabusIdOrderByOrderIndexAsc(syllabus.getId());
        if (documents.isEmpty()) {
            throw ApiException.badRequest("This syllabus has no uploaded documents.");
        }
        String syllabusExcerpt = documents.stream().map(SyllabusDocument::getExtractedText)
                .reduce((a, b) -> a + "\n\n" + b).orElse("");
        if (syllabusExcerpt.length() > MAX_SYLLABUS_CHARS) {
            syllabusExcerpt = syllabusExcerpt.substring(0, MAX_SYLLABUS_CHARS);
        }
        String userPrompt = "Term: " + syllabus.getTerm()
                + "\nTerm start date: " + syllabus.getTermStartDate()
                + "\n\nSyllabus text:\n" + syllabusExcerpt;

        JsonNode topicsJson = completeWithRetry(userPrompt);

        List<Topic> topics = new ArrayList<>();
        int order = 0;
        int previousEndWeek = 0;
        boolean adjusted = false;
        for (JsonNode node : topicsJson) {
            String title = node.path("title").asText("").trim();
            if (title.isEmpty()) continue;

            YearMonth month = tryParseYearMonth(node.path("month").isTextual() ? node.path("month").asText() : null);
            Integer startWeek = null;
            Integer endWeek = null;
            LocalDate start;
            LocalDate end;

            if (month != null) {
                YearMonth termMonth = YearMonth.from(syllabus.getTermStartDate());
                boolean beforeTermStart = month.isBefore(termMonth);
                boolean tooFarAway = Math.abs(Period.between(termMonth.atDay(1), month.atDay(1)).toTotalMonths()) > MAX_REASONABLE_MONTH_DISTANCE;
                if (beforeTermStart || tooFarAway) {
                    log.warn("Clamping month '{}' for topic '{}' relative to term start {} ({})",
                            month, title, syllabus.getTermStartDate(), beforeTermStart ? "before term start" : "too far away");
                    month = termMonth;
                    adjusted = true;
                }
                start = month.atDay(1);
                end = month.atEndOfMonth();
            } else {
                int startWeekInt = node.path("startWeek").isInt() ? node.path("startWeek").asInt() : previousEndWeek + 1;
                int endWeekInt = node.path("endWeek").isInt() ? node.path("endWeek").asInt() : startWeekInt;
                if (endWeekInt < startWeekInt) endWeekInt = startWeekInt;

                boolean unreasonable = startWeekInt > ABSOLUTE_MAX_WEEK || (startWeekInt - previousEndWeek) > MAX_REASONABLE_WEEK_JUMP;
                if (unreasonable) {
                    log.warn("Clamping unreasonable week range for topic '{}': AI said startWeek={}, endWeek={} (previous topic ended week {})",
                            title, startWeekInt, endWeekInt, previousEndWeek);
                    startWeekInt = previousEndWeek + 1;
                    endWeekInt = startWeekInt;
                    adjusted = true;
                }
                previousEndWeek = endWeekInt;
                startWeek = startWeekInt;
                endWeek = endWeekInt;
                start = syllabus.getTermStartDate().plusWeeks(startWeekInt - 1L);
                end = syllabus.getTermStartDate().plusWeeks(endWeekInt).minusDays(1);
            }

            Topic topic = new Topic(syllabus, title, startWeek, endWeek, start, end, order++);
            topics.add(topic);
        }

        if (topics.isEmpty()) {
            throw ApiException.badRequest("The AI could not identify any topics in this document. Try a clearer syllabus file, or add topics manually.");
        }

        List<Topic> existing = topicRepository.findBySyllabusIdOrderByOrderIndexAsc(syllabus.getId());
        topicRepository.deleteAll(existing);

        List<TopicResponse> saved = topicRepository.saveAll(topics).stream().map(TopicResponse::from).toList();
        return new TopicExtractionResult(saved, adjusted);
    }

    private YearMonth tryParseYearMonth(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return YearMonth.parse(value.trim());
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static final int MAX_ATTEMPTS = 3;

    /**
     * Small local models (e.g. llama3.2 3B via Ollama) occasionally emit malformed JSON, especially on
     * noisy OCR'd input — this is a real, observed failure mode, not a hypothetical one, so it gets a few
     * repair attempts before giving up rather than failing on the first hiccup.
     */
    private JsonNode completeWithRetry(String userPrompt) {
        String prompt = userPrompt;
        IllegalArgumentException lastFailure = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            String raw = llmClient.complete(SYSTEM_PROMPT, prompt);
            try {
                JsonNode parsed = JsonExtractionUtil.extractJson(raw);
                if (parsed.isArray()) return parsed;
                throw new IllegalArgumentException("Expected a JSON array");
            } catch (IllegalArgumentException failure) {
                lastFailure = failure;
                log.warn("Topic extraction JSON parse failed (attempt {}/{}): {}", attempt, MAX_ATTEMPTS, failure.getMessage());
                prompt = userPrompt + "\n\nYour previous response was not valid JSON. Return ONLY a valid JSON array matching the schema described, with no other text.";
            }
        }
        throw ApiException.internal(
                "The AI returned an unexpected response format after " + MAX_ATTEMPTS + " attempts. Please try again or add topics manually.",
                lastFailure);
    }
}
