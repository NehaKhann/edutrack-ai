package com.edutrack.syllabus.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.syllabus.dto.BulkDeleteResult;
import com.edutrack.syllabus.dto.BulkDeleteTopicsRequest;
import com.edutrack.syllabus.dto.ReorderTopicsRequest;
import com.edutrack.syllabus.dto.ShiftTopicDatesRequest;
import com.edutrack.syllabus.dto.ShiftTopicDatesResult;
import com.edutrack.syllabus.dto.TopicResponse;
import com.edutrack.syllabus.dto.TopicSearchResult;
import com.edutrack.syllabus.dto.TopicUpsertRequest;
import com.edutrack.syllabus.service.TopicService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TopicController {

    private final TopicService topicService;

    @GetMapping("/api/syllabus/{syllabusId}/topics")
    public ApiResponse<List<TopicResponse>> list(@PathVariable Long syllabusId) {
        return ApiResponse.ok(topicService.listForSyllabus(syllabusId));
    }

    @PostMapping("/api/syllabus/{syllabusId}/topics")
    public ApiResponse<TopicResponse> create(@PathVariable Long syllabusId, @Valid @RequestBody TopicUpsertRequest request) {
        return ApiResponse.ok(topicService.create(syllabusId, request));
    }

    @PutMapping("/api/topics/{topicId}")
    public ApiResponse<TopicResponse> update(@PathVariable Long topicId, @Valid @RequestBody TopicUpsertRequest request) {
        return ApiResponse.ok(topicService.update(topicId, request));
    }

    @DeleteMapping("/api/topics/{topicId}")
    public ApiResponse<Void> delete(@PathVariable Long topicId) {
        topicService.delete(topicId);
        return ApiResponse.ok(null);
    }

    @PostMapping("/api/topics/bulk-delete")
    public ApiResponse<BulkDeleteResult> deleteMany(@Valid @RequestBody BulkDeleteTopicsRequest request) {
        return ApiResponse.ok(topicService.deleteMany(request.topicIds()));
    }

    @PostMapping("/api/syllabus/{syllabusId}/topics/reorder")
    public ApiResponse<List<TopicResponse>> reorder(@PathVariable Long syllabusId, @Valid @RequestBody ReorderTopicsRequest request) {
        return ApiResponse.ok(topicService.reorder(syllabusId, request.topicIdsInOrder()));
    }

    @PostMapping("/api/syllabus/{syllabusId}/topics/shift")
    public ApiResponse<ShiftTopicDatesResult> shiftDates(@PathVariable Long syllabusId, @Valid @RequestBody ShiftTopicDatesRequest request) {
        return ApiResponse.ok(topicService.shiftDates(syllabusId, request.days()));
    }

    @GetMapping("/api/topics/search")
    public ApiResponse<List<TopicSearchResult>> search(@RequestParam String q) {
        return ApiResponse.ok(topicService.search(q));
    }
}
