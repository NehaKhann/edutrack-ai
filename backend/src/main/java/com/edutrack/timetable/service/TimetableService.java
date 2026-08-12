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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
