package com.edutrack.diary.service;

import com.edutrack.common.ApiException;
import com.edutrack.diary.dto.DiaryEntryResponse;
import com.edutrack.diary.dto.DiarySubjectRow;
import com.edutrack.diary.entity.DiaryEntry;
import com.edutrack.diary.entity.DiaryEntryStatus;
import com.edutrack.diary.repository.DiaryEntryRepository;
import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.storage.FileStorageService;
import com.edutrack.storage.UploadGuard;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DiaryService {

    private final DiaryEntryRepository diaryEntryRepository;
    private final SubjectRepository subjectRepository;
    private final ClassSectionRepository classSectionRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    @Transactional
    public DiaryEntryResponse upsert(Long subjectId, LocalDate date, String content, String pageNumber,
                                      LocalDate dueDate, MultipartFile attachment, boolean draft) {
        Subject subject = getOwnedSubject(subjectId);
        AuthenticatedUser currentUser = CurrentUser.get();
        User teacher = userRepository.findById(currentUser.getUserId()).orElseThrow();

        DiaryEntry entry = diaryEntryRepository.findBySubjectIdAndEntryDate(subjectId, date)
                .orElseGet(() -> new DiaryEntry(subject, teacher, date, content));
        entry.setContent(content);
        entry.setPageNumber(pageNumber);
        entry.setDueDate(dueDate);
        entry.setStatus(draft ? DiaryEntryStatus.DRAFT : DiaryEntryStatus.SUBMITTED);
        entry.setUpdatedAt(Instant.now());

        if (attachment != null && !attachment.isEmpty()) {
            UploadGuard.assertSafe(attachment);
            if (entry.getAttachmentFileRef() != null) {
                fileStorageService.delete(entry.getAttachmentFileRef());
            }
            entry.setAttachmentFileRef(fileStorageService.store(attachment, "diary"));
            entry.setAttachmentFilename(attachment.getOriginalFilename());
        }

        return DiaryEntryResponse.from(diaryEntryRepository.save(entry));
    }

    @Transactional(readOnly = true)
    public List<DiaryEntryResponse> listMine(LocalDate date) {
        Long teacherId = CurrentUser.get().getUserId();
        return diaryEntryRepository.findByTeacherIdAndEntryDateOrderByIdDesc(teacherId, date).stream()
                .map(DiaryEntryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<DiarySubjectRow> listForClassSection(Long classSectionId, LocalDate date) {
        List<Subject> subjects = subjectRepository.findByClassSectionId(classSectionId).stream()
                .filter(s -> s.getClassSection().getSchool().getId().equals(CurrentUser.get().getSchoolId()))
                .sorted(Comparator.comparing(Subject::getName))
                .toList();
        if (subjects.isEmpty()) return List.of();

        // Drafts are a teacher's own work-in-progress and are not surfaced to the principal as "submitted".
        List<DiaryEntry> entries = diaryEntryRepository.findBySubjectClassSectionIdAndEntryDate(classSectionId, date).stream()
                .filter(e -> e.getStatus() == DiaryEntryStatus.SUBMITTED)
                .toList();

        return subjects.stream().map(subject -> {
            DiaryEntry match = entries.stream().filter(e -> e.getSubject().getId().equals(subject.getId())).findFirst().orElse(null);
            return new DiarySubjectRow(
                    subject.getId(), subject.getName(),
                    subject.getTeacher().getId(), subject.getTeacher().getName(),
                    match == null ? null : DiaryEntryResponse.from(match)
            );
        }).toList();
    }

    @Transactional(readOnly = true)
    public byte[] getAttachmentBytes(Long diaryEntryId) {
        DiaryEntry entry = diaryEntryRepository.findById(diaryEntryId)
                .orElseThrow(() -> ApiException.notFound("Diary entry not found"));
        assertSchoolAccess(entry.getSubject());
        if (entry.getAttachmentFileRef() == null) {
            throw ApiException.notFound("This entry has no attachment");
        }
        return fileStorageService.load(entry.getAttachmentFileRef());
    }

    @Transactional(readOnly = true)
    public String getAttachmentFilename(Long diaryEntryId) {
        return diaryEntryRepository.findById(diaryEntryId)
                .map(DiaryEntry::getAttachmentFilename)
                .orElse("attachment");
    }

    /** Principal-only. Submitted diary entries for one class over a date range, for record-keeping/compliance purposes. */
    @Transactional(readOnly = true)
    public byte[] exportDiaryXlsx(Long classSectionId, LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            throw ApiException.badRequest("End date can't be before the start date");
        }
        ClassSection classSection = classSectionRepository.findById(classSectionId)
                .orElseThrow(() -> ApiException.notFound("Class not found"));
        if (!classSection.getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Class not found");
        }

        List<DiaryEntry> entries = diaryEntryRepository.findBySubjectClassSectionIdAndEntryDateBetween(classSectionId, from, to).stream()
                .filter(e -> e.getStatus() == DiaryEntryStatus.SUBMITTED)
                .sorted(Comparator.comparing(DiaryEntry::getEntryDate).thenComparing(e -> e.getSubject().getName()))
                .toList();

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Diary");
            CellStyle headerStyle = exportHeaderStyle(workbook);
            String[] cols = {"Date", "Subject", "Teacher", "Content", "Page Number", "Due Date", "Status"};
            Row header = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
            }
            int rowIdx = 1;
            for (DiaryEntry e : entries) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(e.getEntryDate().toString());
                row.createCell(1).setCellValue(e.getSubject().getName());
                row.createCell(2).setCellValue(e.getTeacher().getName());
                row.createCell(3).setCellValue(e.getContent());
                row.createCell(4).setCellValue(e.getPageNumber() != null ? e.getPageNumber() : "");
                row.createCell(5).setCellValue(e.getDueDate() != null ? e.getDueDate().toString() : "");
                row.createCell(6).setCellValue(e.getStatus().name());
            }
            for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw ApiException.internal("Could not generate diary export", e);
        }
    }

    private CellStyle exportHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private Subject getOwnedSubject(Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        AuthenticatedUser user = CurrentUser.get();
        if (!subject.getClassSection().getSchool().getId().equals(user.getSchoolId())) {
            throw ApiException.notFound("Subject not found");
        }
        if (user.getRole() == Role.TEACHER && !subject.getTeacher().getId().equals(user.getUserId())) {
            throw ApiException.forbidden("You can only write the diary for subjects you teach");
        }
        return subject;
    }

    private void assertSchoolAccess(Subject subject) {
        if (!subject.getClassSection().getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Diary entry not found");
        }
    }
}
