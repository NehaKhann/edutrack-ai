package com.edutrack.org.service;

import com.edutrack.common.ApiException;
import com.edutrack.common.ImportSkippedRow;
import com.edutrack.org.dto.StudentImportResultResponse;
import com.edutrack.org.dto.StudentUpsertRequest;
import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.security.CurrentUser;
import com.edutrack.storage.UploadGuard;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Bulk-creates students from an uploaded .xlsx, one row per student, reusing {@link StudentService#create} as-is. */
@Service
@RequiredArgsConstructor
public class StudentImportService {

    private static final String[] TEMPLATE_COLUMNS = {"Class", "Section", "Roll Number", "Name"};

    private final ClassSectionRepository classSectionRepository;
    private final StudentService studentService;

    @Transactional(readOnly = true)
    public byte[] downloadTemplate() {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Students");
            CellStyle headerStyle = headerStyle(workbook);
            Row header = sheet.createRow(0);
            for (int i = 0; i < TEMPLATE_COLUMNS.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(TEMPLATE_COLUMNS[i]);
                cell.setCellStyle(headerStyle);
            }
            Row example = sheet.createRow(1);
            example.createCell(0).setCellValue("Grade 6");
            example.createCell(1).setCellValue("Violet");
            example.createCell(2).setCellValue("23");
            example.createCell(3).setCellValue("Aisha Khan");
            for (int i = 0; i < TEMPLATE_COLUMNS.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw ApiException.internal("Could not generate the import template", e);
        }
    }

    @Transactional
    public StudentImportResultResponse importXlsx(MultipartFile file) {
        UploadGuard.assertSafe(file);
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".xlsx")) {
            throw ApiException.badRequest("Please upload the file as .xlsx");
        }

        Long schoolId = CurrentUser.get().getSchoolId();
        int created = 0;
        List<ImportSkippedRow> skipped = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;

                String className = cellText(row, 0, formatter);
                String sectionName = cellText(row, 1, formatter);
                String rollNumber = cellText(row, 2, formatter);
                String studentName = cellText(row, 3, formatter);
                int excelRow = rowIdx + 1;

                if (className.isBlank() && rollNumber.isBlank() && studentName.isBlank()) {
                    continue;
                }
                if (className.isBlank() || rollNumber.isBlank() || studentName.isBlank()) {
                    skipped.add(new ImportSkippedRow(excelRow, "Missing class, roll number, or name"));
                    continue;
                }

                Optional<ClassSection> classSection = sectionName.isBlank()
                        ? classSectionRepository.findBySchoolIdAndClassNameIgnoreCaseAndSectionNameIsNull(schoolId, className)
                        : classSectionRepository.findBySchoolIdAndClassNameIgnoreCaseAndSectionNameIgnoreCase(schoolId, className, sectionName);

                if (classSection.isEmpty()) {
                    String label = sectionName.isBlank() ? className : className + " — " + sectionName;
                    skipped.add(new ImportSkippedRow(excelRow, "Class '" + label + "' not found"));
                    continue;
                }

                studentService.create(classSection.get().getId(), new StudentUpsertRequest(studentName, rollNumber));
                created++;
            }
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the uploaded file — make sure it's a valid .xlsx file");
        }

        return new StudentImportResultResponse(created, skipped);
    }

    private String cellText(Row row, int index, DataFormatter formatter) {
        Cell cell = row.getCell(index);
        return cell == null ? "" : formatter.formatCellValue(cell).trim();
    }

    private CellStyle headerStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }
}
