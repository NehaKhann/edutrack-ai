package com.edutrack.org.service;

import com.edutrack.audit.entity.AuditAction;
import com.edutrack.audit.service.AuditLogService;
import com.edutrack.common.ApiException;
import com.edutrack.org.dto.StudentResponse;
import com.edutrack.org.dto.StudentUpsertRequest;
import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.Student;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.org.repository.StudentRepository;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final ClassSectionRepository classSectionRepository;
    private final SubjectRepository subjectRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<StudentResponse> listForClassSection(Long classSectionId) {
        ClassSection classSection = getAccessible(classSectionId);
        return studentRepository.findByClassSectionIdAndActiveTrueOrderByRollNumberAsc(classSection.getId())
                .stream().map(StudentResponse::from).toList();
    }

    @Transactional
    public StudentResponse create(Long classSectionId, StudentUpsertRequest request) {
        ClassSection classSection = getAccessible(classSectionId);
        Student student = new Student(classSection, request.name(), request.rollNumber());
        Student saved = studentRepository.save(student);
        auditLogService.record(AuditAction.STUDENT_CREATED, "STUDENT", saved.getId(), saved.getName(),
                "Added to " + classSection.getName() + " (roll no. " + saved.getRollNumber() + ")");
        return StudentResponse.from(saved);
    }

    @Transactional
    public StudentResponse update(Long studentId, StudentUpsertRequest request) {
        Student student = getAccessibleStudent(studentId);
        student.setName(request.name());
        student.setRollNumber(request.rollNumber());
        Student saved = studentRepository.save(student);
        auditLogService.record(AuditAction.STUDENT_UPDATED, "STUDENT", saved.getId(), saved.getName(), null);
        return StudentResponse.from(saved);
    }

    @Transactional
    public void deactivate(Long studentId) {
        Student student = getAccessibleStudent(studentId);
        student.setActive(false);
        studentRepository.save(student);
        auditLogService.record(AuditAction.STUDENT_DEACTIVATED, "STUDENT", studentId, student.getName(), null);
    }

    private ClassSection getAccessible(Long classSectionId) {
        ClassSection classSection = classSectionRepository.findById(classSectionId)
                .orElseThrow(() -> ApiException.notFound("Class not found"));
        AuthenticatedUser user = CurrentUser.get();
        if (!classSection.getSchool().getId().equals(user.getSchoolId())) {
            throw ApiException.notFound("Class not found");
        }
        if (user.getRole() == Role.TEACHER
                && !subjectRepository.existsByClassSectionIdAndTeacherId(classSectionId, user.getUserId())) {
            throw ApiException.forbidden("You don't teach any subject in this class");
        }
        return classSection;
    }

    private Student getAccessibleStudent(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> ApiException.notFound("Student not found"));
        getAccessible(student.getClassSection().getId());
        return student;
    }
}
