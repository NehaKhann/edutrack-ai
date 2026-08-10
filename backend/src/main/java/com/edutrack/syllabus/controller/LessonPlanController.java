package com.edutrack.syllabus.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.syllabus.dto.ConfirmLessonPlanRequest;
import com.edutrack.syllabus.dto.LessonPlanEntryResponse;
import com.edutrack.syllabus.service.LessonPlanService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lesson-plan")
@RequiredArgsConstructor
public class LessonPlanController {

    private final LessonPlanService lessonPlanService;

    @GetMapping("/today")
    public ApiResponse<List<LessonPlanEntryResponse>> today(
            @RequestParam Long subjectId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.ok(lessonPlanService.getOrSuggestToday(subjectId, date != null ? date : LocalDate.now()));
    }

    @PostMapping
    public ApiResponse<LessonPlanEntryResponse> add(@Valid @RequestBody AddLessonPlanEntryRequestWithSubject request) {
        return ApiResponse.ok(lessonPlanService.addEntry(request.subjectId(), request.topicId(), request.plannedDate()));
    }

    @PutMapping("/{entryId}/topic")
    public ApiResponse<LessonPlanEntryResponse> changeTopic(@PathVariable Long entryId, @RequestBody Map<String, Long> body) {
        Long topicId = body.get("topicId");
        if (topicId == null) {
            throw com.edutrack.common.ApiException.badRequest("topicId is required");
        }
        return ApiResponse.ok(lessonPlanService.updateEntryTopic(entryId, topicId));
    }

    @PostMapping("/{entryId}/confirm")
    public ApiResponse<LessonPlanEntryResponse> confirm(@PathVariable Long entryId, @Valid @RequestBody ConfirmLessonPlanRequest request) {
        return ApiResponse.ok(lessonPlanService.confirm(entryId, request.status(), request.reason()));
    }

    public record AddLessonPlanEntryRequestWithSubject(
            @NotNull Long subjectId, @NotNull Long topicId, LocalDate plannedDate) {
    }
}
