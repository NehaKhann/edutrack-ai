package com.edutrack.org.dto;

import com.edutrack.org.entity.ClassSection;

public record ClassSectionResponse(Long id, String name) {
    public static ClassSectionResponse from(ClassSection c) {
        return new ClassSectionResponse(c.getId(), c.getName());
    }
}
