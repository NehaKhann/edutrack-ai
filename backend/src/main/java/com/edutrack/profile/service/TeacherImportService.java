package com.edutrack.profile.service;

import com.edutrack.common.ApiException;
import com.edutrack.common.ImportSkippedRow;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.profile.dto.TeacherAccountResponse;
import com.edutrack.profile.dto.TeacherImportResultResponse;
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

/**
 * Bulk-creates teacher accounts from an uploaded .xlsx, one row per teacher — no subject/class
 * assignment here, that stays a manual step (see {@link com.edutrack.org.entity.Subject}). Reuses
 * {@link TeacherProfileService#createTeacherAccount} as-is, so the temp-password/notification/audit-log
 * behavior is identical to creating one teacher at a time.
 */
@Service
@RequiredArgsConstructor
public class TeacherImportService {

    private static final String[] TEMPLATE_COLUMNS = {"Name", "Email", "Phone"};

    private final UserRepository userRepository;
    private final TeacherProfileService teacherProfileService;

    @Transactional(readOnly = true)
    public byte[] downloadTemplate() {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Teachers");
            CellStyle headerStyle = headerStyle(workbook);
            Row header = sheet.createRow(0);
            for (int i = 0; i < TEMPLATE_COLUMNS.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(TEMPLATE_COLUMNS[i]);
                cell.setCellStyle(headerStyle);
            }
            Row example = sheet.createRow(1);
            example.createCell(0).setCellValue("Sana Tariq");
            example.createCell(1).setCellValue("sana.tariq@example.school");
            example.createCell(2).setCellValue("03001234567");
            for (int i = 0; i < TEMPLATE_COLUMNS.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw ApiException.internal("Could not generate the import template", e);
        }
    }

    @Transactional
    public TeacherImportResultResponse importXlsx(MultipartFile file) {
        UploadGuard.assertSafe(file);
        String filename = file.getOriginalFilename();
        if (filename == null || !filename.toLowerCase().endsWith(".xlsx")) {
            throw ApiException.badRequest("Please upload the file as .xlsx");
        }

        List<TeacherImportResultResponse.CreatedTeacher> created = new ArrayList<>();
        List<ImportSkippedRow> skipped = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int rowIdx = 1; rowIdx <= sheet.getLastRowNum(); rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null) continue;

                String name = cellText(row, 0, formatter);
                String email = cellText(row, 1, formatter);
                String phone = cellText(row, 2, formatter);
                int excelRow = rowIdx + 1;

                if (name.isBlank() && email.isBlank()) {
                    continue;
                }
                if (name.isBlank() || email.isBlank()) {
                    skipped.add(new ImportSkippedRow(excelRow, "Missing name or email"));
                    continue;
                }
                if (userRepository.existsByEmailIgnoreCase(email.trim())) {
                    skipped.add(new ImportSkippedRow(excelRow, "Email already exists"));
                    continue;
                }

                TeacherAccountResponse account = teacherProfileService.createTeacherAccount(
                        name, email, phone.isBlank() ? null : phone, null);
                created.add(new TeacherImportResultResponse.CreatedTeacher(account.name(), account.email(), account.tempPassword()));
            }
        } catch (IOException e) {
            throw ApiException.badRequest("Could not read the uploaded file — make sure it's a valid .xlsx file");
        }

        return new TeacherImportResultResponse(created, skipped);
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
