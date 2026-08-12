package com.edutrack.org.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.dto.ClassSectionSummaryResponse;
import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.entity.School;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.org.repository.SchoolRepository;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClassSectionService {

    private final ClassSectionRepository classSectionRepository;
    private final SchoolRepository schoolRepository;

    @Transactional
    public ClassSectionSummaryResponse createClass(String className) {
        Long schoolId = CurrentUser.get().getSchoolId();
        if (classSectionRepository.existsBySchoolIdAndClassNameIgnoreCase(schoolId, className.trim())) {
            throw ApiException.conflict("A class with this name already exists");
        }
        School school = schoolRepository.findById(schoolId).orElseThrow(() -> ApiException.notFound("School not found"));
        ClassSection saved = classSectionRepository.save(new ClassSection(className.trim(), school));
        return ClassSectionSummaryResponse.from(saved);
    }

    @Transactional
    public ClassSectionSummaryResponse addSection(String className, String sectionName) {
        Long schoolId = CurrentUser.get().getSchoolId();
        String trimmedClass = className.trim();
        String trimmedSection = sectionName.trim();

        if (classSectionRepository.existsBySchoolIdAndClassNameIgnoreCaseAndSectionNameIgnoreCase(schoolId, trimmedClass, trimmedSection)) {
            throw ApiException.conflict("This class already has a section with this name");
        }
        School school = schoolRepository.findById(schoolId).orElseThrow(() -> ApiException.notFound("School not found"));
        ClassSection saved = classSectionRepository.save(new ClassSection(trimmedClass, trimmedSection, school));
        return ClassSectionSummaryResponse.from(saved);
    }
}
