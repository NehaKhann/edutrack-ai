package com.edutrack.profile.dto;

import com.edutrack.profile.entity.TimetableSlot;

import java.time.DayOfWeek;
import java.time.LocalTime;

public record TimetableSlotResponse(
        Long id,
        DayOfWeek dayOfWeek,
        LocalTime startTime,
        LocalTime endTime,
        Long subjectId,
        String subjectName
) {
    public static TimetableSlotResponse from(TimetableSlot slot) {
        return new TimetableSlotResponse(
                slot.getId(),
                slot.getDayOfWeek(),
                slot.getStartTime(),
                slot.getEndTime(),
                slot.getSubject() != null ? slot.getSubject().getId() : null,
                slot.getSubject() != null ? slot.getSubject().getName() + " — " + slot.getSubject().getClassSection().getName() : null
        );
    }
}
