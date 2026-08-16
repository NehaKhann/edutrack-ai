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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/principal/timetable")
@RequiredArgsConstructor
public class PrincipalTimetableController {

    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

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

    @GetMapping("/class-sections/{classSectionId}/export")
    public ResponseEntity<byte[]> exportClassTimetable(@PathVariable Long classSectionId) {
        byte[] xlsx = timetableService.exportClassTimetableXlsx(classSectionId);
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=timetable-class-" + classSectionId + ".xlsx")
                .body(xlsx);
    }

    @GetMapping("/teachers/{teacherId}/export")
    public ResponseEntity<byte[]> exportTeacherTimetable(@PathVariable Long teacherId) {
        byte[] xlsx = timetableService.exportTeacherTimetableXlsx(teacherId);
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=timetable-teacher-" + teacherId + ".xlsx")
                .body(xlsx);
    }
}
