package com.edutrack.org.dto;

import com.edutrack.org.entity.ClassSection;

public record ClassSectionSummaryResponse(
        Long id,
        String name,
        String className,
        String sectionName
) {
    public static ClassSectionSummaryResponse from(ClassSection c) {
        return new ClassSectionSummaryResponse(c.getId(), c.getName(), c.getClassName(), c.getSectionName());
    }
}
