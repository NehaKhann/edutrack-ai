package com.edutrack.staffattendance.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.CurrentUser;
import com.edutrack.staffattendance.dto.CreateSkipReportRequest;
import com.edutrack.staffattendance.dto.SkippedClassReportResponse;
import com.edutrack.staffattendance.entity.SkippedClassReport;
import com.edutrack.staffattendance.repository.SkippedClassReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SkippedClassService {

    private final SkippedClassReportRepository skippedClassReportRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;

    @Transactional
    public SkippedClassReportResponse submit(CreateSkipReportRequest request) {
        Subject subject = subjectRepository.findById(request.subjectId())
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        Long teacherId = CurrentUser.get().getUserId();
        if (!subject.getTeacher().getId().equals(teacherId)) {
            throw ApiException.forbidden("You can only report a skipped class for a subject you teach");
        }
        User teacher = userRepository.findById(teacherId).orElseThrow();
        SkippedClassReport report = new SkippedClassReport(teacher, subject, request.date(), request.period(), request.reason());
        if (request.substituteTeacherId() != null) {
            User substitute = userRepository.findById(request.substituteTeacherId())
                    .orElseThrow(() -> ApiException.notFound("Substitute teacher not found"));
            report.setSubstituteTeacher(substitute);
        }
        return SkippedClassReportResponse.from(skippedClassReportRepository.save(report));
    }
}
