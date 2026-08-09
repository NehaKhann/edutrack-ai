package com.edutrack.syllabus.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.syllabus.dto.SyllabusResponse;
import com.edutrack.syllabus.dto.TopicResponse;
import com.edutrack.syllabus.entity.Syllabus;
import com.edutrack.syllabus.service.SyllabusService;
import com.edutrack.syllabus.service.TopicExtractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/syllabus")
@RequiredArgsConstructor
public class SyllabusController {

    private final SyllabusService syllabusService;
    private final TopicExtractionService topicExtractionService;

    @PostMapping(consumes = "multipart/form-data")
    public ApiResponse<SyllabusResponse> upload(
            @RequestParam Long subjectId,
            @RequestParam String term,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate termStartDate,
            @RequestParam MultipartFile file
    ) {
        return ApiResponse.ok(syllabusService.upload(subjectId, term, termStartDate, file));
    }

    @GetMapping
    public ApiResponse<List<SyllabusResponse>> listForSubject(@RequestParam Long subjectId) {
        return ApiResponse.ok(syllabusService.listForSubject(subjectId));
    }

    @PostMapping("/{id}/extract-topics")
    public ApiResponse<List<TopicResponse>> extractTopics(@PathVariable Long id) {
        Syllabus syllabus = syllabusService.getOwned(id);
        return ApiResponse.ok(topicExtractionService.extractAndSave(syllabus));
    }
}
