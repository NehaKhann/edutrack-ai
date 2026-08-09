package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.entity.School;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.repository.SchoolRepository;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.pdf.PdfService;
import com.edutrack.security.CurrentUser;
import com.edutrack.syllabus.dto.CoverageGridRow;
import com.edutrack.syllabus.dto.LessonPlanEntryResponse;
import com.edutrack.syllabus.dto.SubjectCoverageDetail;
import com.edutrack.syllabus.dto.TopicResponse;
import com.edutrack.syllabus.entity.LessonPlanStatus;
import com.edutrack.syllabus.entity.Topic;
import com.edutrack.syllabus.repository.LessonPlanEntryRepository;
import com.edutrack.syllabus.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CoverageService {

    private final SubjectRepository subjectRepository;
    private final TopicRepository topicRepository;
    private final LessonPlanEntryRepository lessonPlanEntryRepository;
    private final SchoolRepository schoolRepository;
    private final PdfService pdfService;

    @Transactional(readOnly = true)
    public List<CoverageGridRow> getCoverageGrid() {
        Long schoolId = CurrentUser.get().getSchoolId();
        LocalDate today = LocalDate.now();
        return subjectRepository.findByClassSectionSchoolId(schoolId).stream()
                .map(subject -> toRow(subject, today))
                .toList();
    }

    private CoverageGridRow toRow(Subject subject, LocalDate today) {
        List<Topic> topics = topicRepository.findBySyllabusSubjectIdOrderByOrderIndexAsc(subject.getId());
        long plannedToDate = topics.stream().filter(t -> !t.getPlannedStartDate().isAfter(today)).count();
        long covered = topics.stream().filter(Topic::isCovered).count();

        String status;
        if (topics.isEmpty()) {
            status = "NOT_STARTED";
        } else if (covered == plannedToDate) {
            status = "ON_TRACK";
        } else if (covered > plannedToDate) {
            status = "AHEAD";
        } else {
            status = "BEHIND";
        }

        return new CoverageGridRow(
                subject.getClassSection().getId(), subject.getClassSection().getName(),
                subject.getId(), subject.getName(),
                subject.getTeacher().getId(), subject.getTeacher().getName(),
                plannedToDate, covered, status
        );
    }

    @Transactional(readOnly = true)
    public SubjectCoverageDetail getSubjectDetail(Long subjectId) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        List<TopicResponse> topics = topicRepository.findBySyllabusSubjectIdOrderByOrderIndexAsc(subjectId)
                .stream().map(TopicResponse::from).toList();
        List<LessonPlanEntryResponse> missed = lessonPlanEntryRepository
                .findByTopicSyllabusSubjectIdAndStatusInOrderByPlannedDateDesc(
                        subjectId, List.of(LessonPlanStatus.MISSED, LessonPlanStatus.RESCHEDULED))
                .stream().map(LessonPlanEntryResponse::from).toList();
        return new SubjectCoverageDetail(subjectId, subject.getName(), topics, missed);
    }

    @Transactional(readOnly = true)
    public byte[] exportCoverageReportPdf() {
        Long schoolId = CurrentUser.get().getSchoolId();
        School school = schoolRepository.findById(schoolId).orElseThrow();
        List<java.util.Map<String, Object>> rows = getCoverageGrid().stream().map(r -> {
            java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
            m.put("classSectionName", r.classSectionName());
            m.put("subjectName", r.subjectName());
            m.put("teacherName", r.teacherName());
            m.put("plannedToDateCount", r.plannedToDateCount());
            m.put("coveredCount", r.coveredCount());
            m.put("status", r.status());
            return m;
        }).toList();

        return pdfService.render("coverage-report", java.util.Map.of(
                "schoolName", school.getName(),
                "generatedAt", DateTimeFormatter.ofPattern("d MMM yyyy").format(LocalDate.now()),
                "rows", rows
        ));
    }
}
