package com.edutrack.diary.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.diary.dto.DiaryEntryResponse;
import com.edutrack.diary.dto.DiarySubjectRow;
import com.edutrack.diary.service.DiaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class DiaryController {

    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final DiaryService diaryService;

    @PostMapping(value = "/api/diary", consumes = "multipart/form-data")
    public ApiResponse<DiaryEntryResponse> upsert(
            @RequestParam Long subjectId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String content,
            @RequestParam(required = false) String pageNumber,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDate,
            @RequestParam(required = false) MultipartFile attachment,
            @RequestParam(required = false, defaultValue = "false") boolean draft
    ) {
        return ApiResponse.ok(diaryService.upsert(subjectId, date, content, pageNumber, dueDate, attachment, draft));
    }

    @GetMapping("/api/diary/mine")
    public ApiResponse<List<DiaryEntryResponse>> listMine(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(diaryService.listMine(date));
    }

    @GetMapping("/api/diary/{id}/attachment")
    public ResponseEntity<byte[]> attachment(@PathVariable Long id) {
        byte[] bytes = diaryService.getAttachmentBytes(id);
        String filename = diaryService.getAttachmentFilename(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + sanitize(filename) + "\"")
                .body(bytes);
    }

    @GetMapping("/api/principal/diary")
    public ApiResponse<List<DiarySubjectRow>> listForClassSection(
            @RequestParam Long classSectionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ApiResponse.ok(diaryService.listForClassSection(classSectionId, date));
    }

    @GetMapping("/api/principal/diary/export")
    public ResponseEntity<byte[]> exportDiary(
            @RequestParam Long classSectionId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        byte[] xlsx = diaryService.exportDiaryXlsx(classSectionId, from, to);
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=diary-" + from + "-to-" + to + ".xlsx")
                .body(xlsx);
    }

    private String sanitize(String filename) {
        return filename == null ? "attachment" : filename.replaceAll("[\\r\\n\"]", "_");
    }
}
