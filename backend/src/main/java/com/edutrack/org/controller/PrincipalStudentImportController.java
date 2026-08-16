package com.edutrack.org.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.org.dto.StudentImportResultResponse;
import com.edutrack.org.service.StudentImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class PrincipalStudentImportController {

    private static final MediaType XLSX = MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final StudentImportService studentImportService;

    @GetMapping("/api/principal/students/import/template")
    public ResponseEntity<byte[]> template() {
        return ResponseEntity.ok()
                .contentType(XLSX)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=student-import-template.xlsx")
                .body(studentImportService.downloadTemplate());
    }

    @PostMapping(value = "/api/principal/students/import", consumes = "multipart/form-data")
    public ApiResponse<StudentImportResultResponse> importStudents(@RequestParam MultipartFile file) {
        return ApiResponse.ok(studentImportService.importXlsx(file));
    }
}
