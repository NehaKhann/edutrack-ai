package com.edutrack.org.service;

import com.edutrack.org.dto.SubjectResponse;
import com.edutrack.org.entity.Role;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SubjectService {

    private final SubjectRepository subjectRepository;

    @Transactional(readOnly = true)
    public List<SubjectResponse> getMySubjects() {
        AuthenticatedUser user = CurrentUser.get();
        if (user.getRole() == Role.TEACHER) {
            return subjectRepository.findByTeacherId(user.getUserId()).stream().map(SubjectResponse::from).toList();
        }
        return subjectRepository.findByClassSectionSchoolId(user.getSchoolId()).stream().map(SubjectResponse::from).toList();
    }
}
