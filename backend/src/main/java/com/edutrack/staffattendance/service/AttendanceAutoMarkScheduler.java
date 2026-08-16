package com.edutrack.staffattendance.service;

import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.School;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.SchoolRepository;
import com.edutrack.org.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Best-effort sweep that auto-marks teachers Absent once a school's cutoff has passed, even if
 * nobody happens to load a page that would otherwise trigger {@link TeacherAttendanceService#ensureAutoAbsentIfPastCutoff}
 * lazily. This is NOT the source of correctness — Render's free tier can sleep the dyno straight
 * through the cutoff time, so this job has no guarantee of firing exactly on schedule. The lazy
 * check on read is what actually makes the feature correct regardless of whether this job ran.
 */
@Component
@RequiredArgsConstructor
public class AttendanceAutoMarkScheduler {

    private static final Logger log = LoggerFactory.getLogger(AttendanceAutoMarkScheduler.class);

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;
    private final TeacherAttendanceService teacherAttendanceService;

    @Scheduled(cron = "0 */15 * * * *")
    public void sweep() {
        List<School> schools = schoolRepository.findAll();
        for (School school : schools) {
            List<User> teachers = userRepository.findBySchoolIdAndRoleAndActive(school.getId(), Role.TEACHER, true);
            for (User teacher : teachers) {
                try {
                    teacherAttendanceService.ensureAutoAbsentIfPastCutoff(teacher.getId(), school.getId());
                } catch (Exception e) {
                    log.warn("Auto-absent sweep failed for teacher {}", teacher.getId(), e);
                }
            }
        }
    }
}
