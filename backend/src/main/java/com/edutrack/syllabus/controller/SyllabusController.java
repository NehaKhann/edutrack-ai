package com.edutrack.syllabus.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.syllabus.dto.SyllabusDocumentResponse;
import com.edutrack.syllabus.dto.SyllabusResponse;
import com.edutrack.syllabus.dto.SyllabusUploadResult;
import com.edutrack.syllabus.dto.TopicResponse;
import com.edutrack.syllabus.dto.UpdateDocumentTextRequest;
import com.edutrack.syllabus.entity.Syllabus;
import com.edutrack.syllabus.service.SyllabusService;
import com.edutrack.syllabus.service.TopicExtractionService;
import jakarta.validation.Valid;
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
    public ApiResponse<SyllabusUploadResult> create(
            @RequestParam Long subjectId,
            @RequestParam String term,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate termStartDate,
            @RequestParam("files") List<MultipartFile> files
    ) {
        return ApiResponse.ok(syllabusService.createSyllabusWithDocuments(subjectId, term, termStartDate, files));
    }

    @GetMapping
    public ApiResponse<List<SyllabusResponse>> listForSubject(@RequestParam Long subjectId) {
        return ApiResponse.ok(syllabusService.listForSubject(subjectId));
    }

    @PostMapping(value = "/{id}/documents", consumes = "multipart/form-data")
    public ApiResponse<SyllabusUploadResult> addDocuments(@PathVariable Long id, @RequestParam("files") List<MultipartFile> files) {
        return ApiResponse.ok(syllabusService.addDocuments(id, files));
    }

    @GetMapping("/{id}/documents")
    public ApiResponse<List<SyllabusDocumentResponse>> listDocuments(@PathVariable Long id) {
        return ApiResponse.ok(syllabusService.listDocuments(id));
    }

    @PutMapping("/documents/{documentId}")
    public ApiResponse<SyllabusDocumentResponse> updateDocument(
            @PathVariable Long documentId, @Valid @RequestBody UpdateDocumentTextRequest request) {
        return ApiResponse.ok(syllabusService.updateDocumentText(documentId, request.extractedText()));
    }

    @DeleteMapping("/documents/{documentId}")
    public ApiResponse<Void> deleteDocument(@PathVariable Long documentId) {
        syllabusService.deleteDocument(documentId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/{id}/confirm")
    public ApiResponse<SyllabusResponse> confirm(@PathVariable Long id) {
        return ApiResponse.ok(syllabusService.confirm(id));
    }

    @PostMapping("/{id}/unconfirm")
    public ApiResponse<SyllabusResponse> unconfirm(@PathVariable Long id) {
        return ApiResponse.ok(syllabusService.unconfirm(id));
    }

    @PostMapping("/{id}/extract-topics")
    public ApiResponse<List<TopicResponse>> extractTopics(@PathVariable Long id) {
        Syllabus syllabus = syllabusService.getOwned(id);
        var result = topicExtractionService.extractAndSave(syllabus);
        String message = result.weeksAdjusted()
                ? "Some week numbers looked unusual and were auto-corrected — please double-check the dates below."
                : null;
        return ApiResponse.ok(result.topics(), message);
    }
}
