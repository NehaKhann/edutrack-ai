package com.edutrack.org.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.dto.SubjectResponse;
import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;
    private final ClassSectionRepository classSectionRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<SubjectResponse> getMySubjects() {
        AuthenticatedUser user = CurrentUser.get();
        if (user.getRole() == Role.TEACHER) {
            return subjectRepository.findByTeacherId(user.getUserId()).stream().map(SubjectResponse::from).toList();
        }
        return subjectRepository.findByClassSectionSchoolId(user.getSchoolId()).stream().map(SubjectResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<SubjectResponse> listSubjects(Long classSectionId) {
        Long schoolId = CurrentUser.get().getSchoolId();
        List<Subject> subjects;
        if (classSectionId != null) {
            ClassSection classSection = findClassSection(classSectionId, schoolId);
            subjects = subjectRepository.findByClassSectionId(classSection.getId());
        } else {
            subjects = subjectRepository.findByClassSectionSchoolId(schoolId);
        }
        return subjects.stream()
                .sorted(Comparator.comparing((Subject s) -> s.getClassSection().getName()).thenComparing(Subject::getName))
                .map(SubjectResponse::from)
                .toList();
    }

    @Transactional
    public SubjectResponse createSubject(Long classSectionId, String name, Long teacherId) {
        Long schoolId = CurrentUser.get().getSchoolId();
        ClassSection classSection = findClassSection(classSectionId, schoolId);
        User teacher = findTeacher(teacherId, schoolId);

        if (subjectRepository.existsByClassSectionIdAndNameIgnoreCase(classSectionId, name.trim())) {
            throw ApiException.conflict("This class already has a subject with this name");
        }

        Subject saved = subjectRepository.save(new Subject(name.trim(), classSection, teacher));
        return SubjectResponse.from(saved);
    }

    @Transactional
    public SubjectResponse updateSubject(Long subjectId, String name, Long teacherId) {
        Long schoolId = CurrentUser.get().getSchoolId();
        Subject subject = subjectRepository.findById(subjectId).orElseThrow(() -> ApiException.notFound("Subject not found"));
        if (!subject.getClassSection().getSchool().getId().equals(schoolId)) {
            throw ApiException.notFound("Subject not found");
        }
        User teacher = findTeacher(teacherId, schoolId);

        String trimmedName = name.trim();
        if (!trimmedName.equalsIgnoreCase(subject.getName())
                && subjectRepository.existsByClassSectionIdAndNameIgnoreCase(subject.getClassSection().getId(), trimmedName)) {
            throw ApiException.conflict("This class already has a subject with this name");
        }

        subject.setName(trimmedName);
        subject.setTeacher(teacher);
        return SubjectResponse.from(subjectRepository.save(subject));
    }

    private ClassSection findClassSection(Long classSectionId, Long schoolId) {
        ClassSection classSection = classSectionRepository.findById(classSectionId)
                .orElseThrow(() -> ApiException.notFound("Class not found"));
        if (!classSection.getSchool().getId().equals(schoolId)) {
            throw ApiException.notFound("Class not found");
        }
        return classSection;
    }

    private User findTeacher(Long teacherId, Long schoolId) {
        User teacher = userRepository.findById(teacherId)
                .filter(u -> u.getRole() == Role.TEACHER)
                .orElseThrow(() -> ApiException.notFound("Teacher not found"));
        if (!teacher.getSchool().getId().equals(schoolId)) {
            throw ApiException.notFound("Teacher not found");
        }
        return teacher;
    }
}
