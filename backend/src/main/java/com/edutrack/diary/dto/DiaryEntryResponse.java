package com.edutrack.diary.dto;

import com.edutrack.diary.entity.DiaryEntry;

import java.time.Instant;
import java.time.LocalDate;

public record DiaryEntryResponse(
        Long id,
        Long subjectId,
        String subjectName,
        String classSectionName,
        Long teacherId,
        String teacherName,
        LocalDate date,
        String content,
        String pageNumber,
        LocalDate dueDate,
        boolean hasAttachment,
        String attachmentFilename,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static DiaryEntryResponse from(DiaryEntry e) {
        return new DiaryEntryResponse(
                e.getId(), e.getSubject().getId(), e.getSubject().getName(), e.getSubject().getClassSection().getName(),
                e.getTeacher().getId(), e.getTeacher().getName(),
                e.getEntryDate(), e.getContent(), e.getPageNumber(), e.getDueDate(),
                e.getAttachmentFileRef() != null, e.getAttachmentFilename(),
                e.getStatus().name(), e.getCreatedAt(), e.getUpdatedAt()
        );
    }
}
