package com.edutrack.attendance.service;

import com.edutrack.attendance.dto.BulkAttendanceRequest;
import com.edutrack.attendance.dto.ClassAttendanceSummary;
import com.edutrack.attendance.dto.StudentAttendanceRow;
import com.edutrack.attendance.entity.StudentAttendanceRecord;
import com.edutrack.attendance.entity.StudentAttendanceStatus;
import com.edutrack.attendance.repository.StudentAttendanceRecordRepository;
import com.edutrack.common.ApiException;
import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.Student;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.org.repository.StudentRepository;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentAttendanceService {

    private final StudentAttendanceRecordRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final ClassSectionRepository classSectionRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<StudentAttendanceRow> getContext(Long classSectionId, LocalDate date, Long subjectId, Integer period) {
        ClassSection classSection = assertAccessible(classSectionId, subjectId);
        List<Student> roster = studentRepository.findByClassSectionIdAndActiveTrueOrderByRollNumberAsc(classSection.getId());

        List<StudentAttendanceRecord> existing = (subjectId == null)
                ? attendanceRepository.findByClassSectionIdAndAttendanceDateAndSubjectIsNullAndPeriodIsNull(classSectionId, date)
                : attendanceRepository.findByClassSectionIdAndAttendanceDateAndSubjectIdAndPeriod(classSectionId, date, subjectId, period);

        Map<Long, StudentAttendanceStatus> byStudent = existing.stream()
                .collect(Collectors.toMap(r -> r.getStudent().getId(), StudentAttendanceRecord::getStatus));

        return roster.stream()
                .map(s -> new StudentAttendanceRow(s.getId(), s.getName(), s.getRollNumber(), byStudent.get(s.getId())))
                .toList();
    }

    @Transactional
    public void bulkMark(BulkAttendanceRequest request) {
        ClassSection classSection = assertAccessible(request.classSectionId(), request.subjectId());
        Subject subject = request.subjectId() == null ? null : subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        User marker = userRepository.findById(CurrentUser.get().getUserId()).orElseThrow();

        for (BulkAttendanceRequest.Mark mark : request.marks()) {
            Student student = studentRepository.findById(mark.studentId())
                    .orElseThrow(() -> ApiException.notFound("Student not found"));
            if (!student.getClassSection().getId().equals(classSection.getId())) {
                throw ApiException.badRequest("Student does not belong to this class");
            }

            Optional<StudentAttendanceRecord> existing = (request.subjectId() == null)
                    ? attendanceRepository.findByStudentIdAndAttendanceDateAndSubjectIsNullAndPeriodIsNull(student.getId(), request.date())
                    : attendanceRepository.findByStudentIdAndAttendanceDateAndSubjectIdAndPeriod(
                            student.getId(), request.date(), request.subjectId(), request.period());

            StudentAttendanceRecord record = existing.orElseGet(() -> new StudentAttendanceRecord(
                    student, classSection, subject, request.period(), request.date(), mark.status(), marker));
            record.setStatus(mark.status());
            record.setMarkedBy(marker);
            attendanceRepository.save(record);
        }
    }

    @Transactional(readOnly = true)
    public List<ClassAttendanceSummary> principalSummary(LocalDate date) {
        Long schoolId = CurrentUser.get().getSchoolId();
        List<ClassSection> sections = classSectionRepository.findBySchoolId(schoolId);
        List<StudentAttendanceRecord> allRecords =
                attendanceRepository.findByClassSectionSchoolIdAndAttendanceDateAndSubjectIsNullAndPeriodIsNull(schoolId, date);
        Map<Long, List<StudentAttendanceRecord>> byClass = allRecords.stream()
                .collect(Collectors.groupingBy(r -> r.getClassSection().getId()));

        return sections.stream()
                .sorted(Comparator.comparing(ClassSection::getName))
                .map(cs -> {
                    int total = studentRepository.findByClassSectionIdAndActiveTrueOrderByRollNumberAsc(cs.getId()).size();
                    List<StudentAttendanceRecord> records = byClass.getOrDefault(cs.getId(), List.of());
                    int present = (int) records.stream().filter(r -> r.getStatus() == StudentAttendanceStatus.PRESENT).count();
                    int absent = (int) records.stream().filter(r -> r.getStatus() == StudentAttendanceStatus.ABSENT).count();
                    int late = (int) records.stream().filter(r -> r.getStatus() == StudentAttendanceStatus.LATE).count();
                    int leave = (int) records.stream().filter(r -> r.getStatus() == StudentAttendanceStatus.LEAVE).count();
                    double pct = total == 0 ? 0.0 : Math.round((present * 1000.0) / total) / 10.0;
                    return new ClassAttendanceSummary(cs.getId(), cs.getName(), total, present, absent, late, leave, pct, !records.isEmpty());
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudentAttendanceRow> principalDetail(Long classSectionId, LocalDate date) {
        ClassSection classSection = classSectionRepository.findById(classSectionId)
                .orElseThrow(() -> ApiException.notFound("Class not found"));
        if (!classSection.getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Class not found");
        }
        List<Student> roster = studentRepository.findByClassSectionIdAndActiveTrueOrderByRollNumberAsc(classSectionId);
        List<StudentAttendanceRecord> existing =
                attendanceRepository.findByClassSectionIdAndAttendanceDateAndSubjectIsNullAndPeriodIsNull(classSectionId, date);
        Map<Long, StudentAttendanceStatus> byStudent = existing.stream()
                .collect(Collectors.toMap(r -> r.getStudent().getId(), StudentAttendanceRecord::getStatus));
        return roster.stream()
                .map(s -> new StudentAttendanceRow(s.getId(), s.getName(), s.getRollNumber(), byStudent.get(s.getId())))
                .toList();
    }

    private ClassSection assertAccessible(Long classSectionId, Long subjectId) {
        ClassSection classSection = classSectionRepository.findById(classSectionId)
                .orElseThrow(() -> ApiException.notFound("Class not found"));
        AuthenticatedUser user = CurrentUser.get();
        if (!classSection.getSchool().getId().equals(user.getSchoolId())) {
            throw ApiException.notFound("Class not found");
        }
        if (user.getRole() == Role.TEACHER) {
            boolean owns = subjectId != null
                    ? subjectRepository.findById(subjectId).map(s -> s.getTeacher().getId().equals(user.getUserId())).orElse(false)
                    : subjectRepository.existsByClassSectionIdAndTeacherId(classSectionId, user.getUserId());
            if (!owns) {
                throw ApiException.forbidden("You don't teach any subject in this class");
            }
        }
        return classSection;
    }
}
