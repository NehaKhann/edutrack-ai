package com.edutrack.timetable.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.dto.SubjectResponse;
import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.CurrentUser;
import com.edutrack.timetable.dto.CellSaveResult;
import com.edutrack.timetable.dto.ClassTimetableResponse;
import com.edutrack.timetable.dto.TeacherTimetableResponse;
import com.edutrack.timetable.dto.TimetableCellUpsertRequest;
import com.edutrack.timetable.dto.TimetableClashWarning;
import com.edutrack.timetable.dto.TimetableEntryResponse;
import com.edutrack.timetable.entity.TimetableEntry;
import com.edutrack.timetable.repository.TimetableEntryRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableEntryRepository entryRepository;
    private final ClassSectionRepository classSectionRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public TeacherTimetableResponse getMyTimetable() {
        Long teacherId = CurrentUser.get().getUserId();
        User teacher = userRepository.findById(teacherId).orElseThrow(() -> ApiException.notFound("Teacher not found"));
        List<TimetableEntryResponse> entries = entryRepository.findByTeacherIdOrderByDayOfWeekAscPeriodAsc(teacherId).stream()
                .map(TimetableEntryResponse::from)
                .toList();
        return new TeacherTimetableResponse(teacher.getId(), teacher.getName(), entries);
    }

    @Transactional(readOnly = true)
    public ClassTimetableResponse getClassTimetable(Long classSectionId) {
        ClassSection classSection = findClassSection(classSectionId);
        List<TimetableEntryResponse> entries = entryRepository.findByClassSectionIdOrderByDayOfWeekAscPeriodAsc(classSectionId).stream()
                .map(TimetableEntryResponse::from)
                .toList();
        return new ClassTimetableResponse(classSection.getId(), classSection.getName(), entries);
    }

    @Transactional(readOnly = true)
    public TeacherTimetableResponse getTeacherTimetable(Long teacherId) {
        User teacher = findTeacher(teacherId);
        List<TimetableEntryResponse> entries = entryRepository.findByTeacherIdOrderByDayOfWeekAscPeriodAsc(teacherId).stream()
                .map(TimetableEntryResponse::from)
                .toList();
        return new TeacherTimetableResponse(teacher.getId(), teacher.getName(), entries);
    }

    @Transactional(readOnly = true)
    public List<SubjectResponse> getSubjectsForClassSection(Long classSectionId) {
        ClassSection classSection = findClassSection(classSectionId);
        return subjectRepository.findByClassSectionId(classSection.getId()).stream()
                .sorted(Comparator.comparing(Subject::getName))
                .map(SubjectResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubjectResponse> getSubjectsForTeacher(Long teacherId) {
        User teacher = findTeacher(teacherId);
        return subjectRepository.findByTeacherId(teacher.getId()).stream()
                .sorted(Comparator.comparing(s -> s.getClassSection().getName()))
                .map(SubjectResponse::from)
                .toList();
    }

    @Transactional
    public CellSaveResult saveCell(Long classSectionId, TimetableCellUpsertRequest request) {
        ClassSection classSection = findClassSection(classSectionId);
        Optional<TimetableEntry> existing =
                entryRepository.findByClassSectionIdAndDayOfWeekAndPeriod(classSectionId, request.dayOfWeek(), request.period());

        if (request.subjectId() == null) {
            existing.ifPresent(entryRepository::delete);
            return new CellSaveResult(null, List.of());
        }

        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        if (!subject.getClassSection().getId().equals(classSectionId)) {
            throw ApiException.badRequest("Subject does not belong to this class");
        }

        TimetableEntry entry = existing.orElseGet(() -> new TimetableEntry(classSection, request.dayOfWeek(), request.period()));
        entry.setSubject(subject);
        entry.setTeacher(subject.getTeacher());
        entry.setUpdatedAt(java.time.Instant.now());
        TimetableEntry saved = entryRepository.save(entry);

        List<TimetableClashWarning> clashes = entryRepository
                .findByTeacherIdAndDayOfWeekAndPeriod(subject.getTeacher().getId(), request.dayOfWeek(), request.period()).stream()
                .filter(e -> !e.getId().equals(saved.getId()))
                .map(e -> new TimetableClashWarning(e.getClassSection().getId(), e.getClassSection().getName()))
                .toList();

        return new CellSaveResult(TimetableEntryResponse.from(saved), clashes);
    }

    /** Principal-only. Flat day/period listing — not a visual day×period grid, just every occupied slot in order. */
    @Transactional(readOnly = true)
    public byte[] exportClassTimetableXlsx(Long classSectionId) {
        ClassTimetableResponse timetable = getClassTimetable(classSectionId);
        String[] cols = {"Day", "Period", "Subject", "Teacher"};
        return buildWorkbook("Timetable", cols, timetable.entries(), e -> new String[]{
                e.dayOfWeek().name(), String.valueOf(e.period()),
                e.subjectName() != null ? e.subjectName() : "", e.teacherName() != null ? e.teacherName() : ""
        });
    }

    /** Principal-only. Same flat shape as the class export, one row per occupied slot on this teacher's schedule. */
    @Transactional(readOnly = true)
    public byte[] exportTeacherTimetableXlsx(Long teacherId) {
        TeacherTimetableResponse timetable = getTeacherTimetable(teacherId);
        String[] cols = {"Day", "Period", "Class", "Subject"};
        return buildWorkbook("Timetable", cols, timetable.entries(), e -> new String[]{
                e.dayOfWeek().name(), String.valueOf(e.period()),
                e.classSectionName() != null ? e.classSectionName() : "", e.subjectName() != null ? e.subjectName() : ""
        });
    }

    private byte[] buildWorkbook(String sheetName, String[] cols, List<TimetableEntryResponse> entries,
                                  java.util.function.Function<TimetableEntryResponse, String[]> rowMapper) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);
            CellStyle headerStyle = exportHeaderStyle(workbook);
            Row header = sheet.createRow(0);
            for (int i = 0; i < cols.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
            }
            int rowIdx = 1;
            for (TimetableEntryResponse entry : entries) {
                Row row = sheet.createRow(rowIdx++);
                String[] values = rowMapper.apply(entry);
                for (int i = 0; i < values.length; i++) {
                    row.createCell(i).setCellValue(values[i]);
                }
            }
            for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw ApiException.internal("Could not generate timetable export", e);
        }
    }

    private CellStyle exportHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        style.setFont(font);
        return style;
    }

    private ClassSection findClassSection(Long classSectionId) {
        ClassSection classSection = classSectionRepository.findById(classSectionId)
                .orElseThrow(() -> ApiException.notFound("Class not found"));
        if (!classSection.getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Class not found");
        }
        return classSection;
    }

    private User findTeacher(Long teacherId) {
        User teacher = userRepository.findById(teacherId)
                .filter(u -> u.getRole() == Role.TEACHER)
                .orElseThrow(() -> ApiException.notFound("Teacher not found"));
        if (!teacher.getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Teacher not found");
        }
        return teacher;
    }
}
