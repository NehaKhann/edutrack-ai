package com.edutrack.timetable.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.org.dto.SubjectResponse;
import com.edutrack.timetable.dto.CellSaveResult;
import com.edutrack.timetable.dto.ClassTimetableResponse;
import com.edutrack.timetable.dto.TeacherTimetableResponse;
import com.edutrack.timetable.dto.TimetableCellUpsertRequest;
import com.edutrack.timetable.service.TimetableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/principal/timetable")
@RequiredArgsConstructor
public class PrincipalTimetableController {

    private final TimetableService timetableService;

    @GetMapping("/class-sections/{classSectionId}")
    public ApiResponse<ClassTimetableResponse> classTimetable(@PathVariable Long classSectionId) {
        return ApiResponse.ok(timetableService.getClassTimetable(classSectionId));
    }

    @GetMapping("/class-sections/{classSectionId}/subjects")
    public ApiResponse<List<SubjectResponse>> classSubjects(@PathVariable Long classSectionId) {
        return ApiResponse.ok(timetableService.getSubjectsForClassSection(classSectionId));
    }

    @PutMapping("/class-sections/{classSectionId}/cells")
    public ApiResponse<CellSaveResult> saveCell(
            @PathVariable Long classSectionId,
            @Valid @RequestBody TimetableCellUpsertRequest request) {
        return ApiResponse.ok(timetableService.saveCell(classSectionId, request));
    }

    @GetMapping("/teachers/{teacherId}")
    public ApiResponse<TeacherTimetableResponse> teacherTimetable(@PathVariable Long teacherId) {
        return ApiResponse.ok(timetableService.getTeacherTimetable(teacherId));
    }

    @GetMapping("/teachers/{teacherId}/subjects")
    public ApiResponse<List<SubjectResponse>> teacherSubjects(@PathVariable Long teacherId) {
        return ApiResponse.ok(timetableService.getSubjectsForTeacher(teacherId));
    }
}
