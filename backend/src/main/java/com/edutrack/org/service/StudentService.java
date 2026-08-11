package com.edutrack.org.service;

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

    @Transactional(readOnly = true)
    public List<StudentResponse> listForClassSection(Long classSectionId) {
        ClassSection classSection = getAccessible(classSectionId);
        return studentRepository.findByClassSectionIdAndActiveTrueOrderByRollNumberAsc(classSection.getId())
                .stream().map(StudentResponse::from).toList();
    }

    @Transactional
    public StudentResponse create(Long classSectionId, StudentUpsertRequest request) {
        ClassSection classSection = getOwnedByPrincipal(classSectionId);
        Student student = new Student(classSection, request.name(), request.rollNumber());
        return StudentResponse.from(studentRepository.save(student));
    }

    @Transactional
    public StudentResponse update(Long studentId, StudentUpsertRequest request) {
        Student student = getOwnedStudentByPrincipal(studentId);
        student.setName(request.name());
        student.setRollNumber(request.rollNumber());
        return StudentResponse.from(studentRepository.save(student));
    }

    @Transactional
    public void deactivate(Long studentId) {
        Student student = getOwnedStudentByPrincipal(studentId);
        student.setActive(false);
        studentRepository.save(student);
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

    private ClassSection getOwnedByPrincipal(Long classSectionId) {
        assertPrincipal();
        ClassSection classSection = classSectionRepository.findById(classSectionId)
                .orElseThrow(() -> ApiException.notFound("Class not found"));
        if (!classSection.getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Class not found");
        }
        return classSection;
    }

    private Student getOwnedStudentByPrincipal(Long studentId) {
        assertPrincipal();
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> ApiException.notFound("Student not found"));
        if (!student.getClassSection().getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Student not found");
        }
        return student;
    }

    private void assertPrincipal() {
        Role role = CurrentUser.get().getRole();
        if (role != Role.PRINCIPAL && role != Role.ADMIN) {
            throw ApiException.forbidden("Only a Principal can manage students");
        }
    }
}
