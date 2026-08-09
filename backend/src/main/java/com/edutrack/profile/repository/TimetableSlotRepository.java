package com.edutrack.profile.repository;

import com.edutrack.profile.entity.TimetableSlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TimetableSlotRepository extends JpaRepository<TimetableSlot, Long> {
    List<TimetableSlot> findByTeacherIdOrderByDayOfWeekAscStartTimeAsc(Long teacherId);
}
