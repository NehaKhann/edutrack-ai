package com.edutrack.syllabus.controller;

import com.edutrack.common.ApiResponse;
import com.edutrack.syllabus.dto.CoverageGridRow;
import com.edutrack.syllabus.dto.SubjectCoverageDetail;
import com.edutrack.syllabus.service.CoverageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/principal/coverage")
@RequiredArgsConstructor
public class PrincipalCoverageController {

    private final CoverageService coverageService;

    @GetMapping("/grid")
    public ApiResponse<List<CoverageGridRow>> grid() {
        return ApiResponse.ok(coverageService.getCoverageGrid());
    }

    @GetMapping("/subjects/{subjectId}")
    public ApiResponse<SubjectCoverageDetail> subjectDetail(@PathVariable Long subjectId) {
        return ApiResponse.ok(coverageService.getSubjectDetail(subjectId));
    }

    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf() {
        byte[] pdf = coverageService.exportCoverageReportPdf();
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header("Content-Disposition", "attachment; filename=coverage-report.pdf")
                .body(pdf);
    }
}
