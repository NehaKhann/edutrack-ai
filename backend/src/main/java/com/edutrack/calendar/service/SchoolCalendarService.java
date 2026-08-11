package com.edutrack.calendar.service;

import com.edutrack.calendar.dto.BulkUpdateRequest;
import com.edutrack.calendar.dto.BulkUpdateResult;
import com.edutrack.calendar.dto.DayNoteRequest;
import com.edutrack.calendar.dto.DayOverrideResponse;
import com.edutrack.calendar.dto.DayStatusResponse;
import com.edutrack.calendar.dto.MonthViewResponse;
import com.edutrack.calendar.dto.SetDayRequest;
import com.edutrack.calendar.entity.CalendarDayOverride;
import com.edutrack.calendar.entity.DayStatus;
import com.edutrack.calendar.entity.TeacherDayNote;
import com.edutrack.calendar.repository.CalendarDayOverrideRepository;
import com.edutrack.calendar.repository.TeacherDayNoteRepository;
import com.edutrack.common.ApiException;
import com.edutrack.diary.entity.DiaryEntryStatus;
import com.edutrack.diary.repository.DiaryEntryRepository;
import com.edutrack.org.entity.School;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.SchoolRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.staffattendance.entity.LeaveStatus;
import com.edutrack.staffattendance.repository.LeaveRequestRepository;
import com.edutrack.staffattendance.repository.TeacherAttendanceRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SchoolCalendarService {

    private static final long MAX_BULK_RANGE_DAYS = 730;

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;
    private final CalendarDayOverrideRepository overrideRepository;
    private final TeacherDayNoteRepository dayNoteRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final DiaryEntryRepository diaryEntryRepository;
    private final TeacherAttendanceRecordRepository teacherAttendanceRecordRepository;

    @Transactional(readOnly = true)
    public boolean isNonTeachingDay(Long schoolId, LocalDate date) {
        School school = schoolRepository.findById(schoolId).orElseThrow();
        return overrideRepository.findBySchoolIdAndDate(schoolId, date)
                .map(o -> o.getStatus() == DayStatus.OFF)
                .orElseGet(() -> defaultStatus(school, date) == DayStatus.OFF);
    }

    @Transactional(readOnly = true)
    public MonthViewResponse getMonthView(Long schoolId, int year, int month) {
        School school = schoolRepository.findById(schoolId).orElseThrow();
        YearMonth ym = YearMonth.of(year, month);
        List<DayOverrideResponse> overrides = overrideRepository
                .findBySchoolIdAndDateBetweenOrderByDateAsc(schoolId, ym.atDay(1), ym.atEndOfMonth())
                .stream().map(DayOverrideResponse::from).toList();
        return new MonthViewResponse(year, month, Set.copyOf(school.getWeekendDays()), overrides);
    }

    /**
     * Per-day grid for the current user: merges the school-wide calendar status with the
     * caller's own approved leave, diary submission, and attendance-marked signals, plus
     * their private note for that day. Harmless for principals — they simply won't have any
     * diary/attendance/leave rows, so those flags are always false.
     */
    @Transactional(readOnly = true)
    public List<DayStatusResponse> getDayStatusGrid(int year, int month) {
        AuthenticatedUser currentUser = CurrentUser.get();
        School school = schoolRepository.findById(currentUser.getSchoolId()).orElseThrow();
        YearMonth ym = YearMonth.of(year, month);
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth();
        Long teacherId = currentUser.getUserId();

        var overridesByDate = overrideRepository.findBySchoolIdAndDateBetweenOrderByDateAsc(school.getId(), start, end)
                .stream().collect(Collectors.toMap(CalendarDayOverride::getDate, o -> o));

        Set<LocalDate> leaveDates = leaveRequestRepository
                .findByTeacherIdAndStatusAndFromDateLessThanEqualAndToDateGreaterThanEqual(teacherId, LeaveStatus.APPROVED, end, start)
                .stream()
                .flatMap(l -> l.getFromDate().datesUntil(l.getToDate().plusDays(1)))
                .collect(Collectors.toSet());

        Set<LocalDate> diaryDates = diaryEntryRepository.findByTeacherIdAndEntryDateBetween(teacherId, start, end)
                .stream().filter(e -> e.getStatus() == DiaryEntryStatus.SUBMITTED)
                .map(e -> e.getEntryDate()).collect(Collectors.toSet());

        Set<LocalDate> attendanceDates = teacherAttendanceRecordRepository
                .findByTeacherIdAndAttendanceDateBetween(teacherId, start, end)
                .stream().map(r -> r.getAttendanceDate()).collect(Collectors.toSet());

        var notesByDate = dayNoteRepository.findByTeacherIdAndDateBetween(teacherId, start, end)
                .stream().collect(Collectors.toMap(TeacherDayNote::getDate, TeacherDayNote::getNote));

        return start.datesUntil(end.plusDays(1)).map(date -> {
            CalendarDayOverride override = overridesByDate.get(date);
            DayStatus status = override != null ? override.getStatus() : defaultStatus(school, date);
            return new DayStatusResponse(
                    date,
                    status.name(),
                    override != null ? override.getReason() : null,
                    school.getWeekendDays().contains(date.getDayOfWeek()),
                    leaveDates.contains(date),
                    diaryDates.contains(date),
                    attendanceDates.contains(date),
                    notesByDate.get(date)
            );
        }).toList();
    }

    @Transactional
    public void saveNote(DayNoteRequest request) {
        Long teacherId = CurrentUser.get().getUserId();
        var existing = dayNoteRepository.findByTeacherIdAndDate(teacherId, request.date());

        if (request.note() == null || request.note().isBlank()) {
            existing.ifPresent(dayNoteRepository::delete);
            return;
        }

        User teacher = userRepository.findById(teacherId).orElseThrow();
        TeacherDayNote note = existing.orElseGet(() -> new TeacherDayNote(teacher, request.date(), request.note()));
        note.setNote(request.note());
        note.setUpdatedAt(Instant.now());
        dayNoteRepository.save(note);
    }

    @Transactional
    public MonthViewResponse setDay(SetDayRequest request) {
        AuthenticatedUser currentUser = CurrentUser.get();
        School school = schoolRepository.findById(currentUser.getSchoolId()).orElseThrow();
        applyDayStatus(school, request.date(), DayStatus.valueOf(request.status()), request.reason(), currentUser.getUserId());
        return getMonthView(school.getId(), request.date().getYear(), request.date().getMonthValue());
    }

    @Transactional
    public MonthViewResponse resetDay(LocalDate date) {
        Long schoolId = CurrentUser.get().getSchoolId();
        overrideRepository.findBySchoolIdAndDate(schoolId, date).ifPresent(overrideRepository::delete);
        return getMonthView(schoolId, date.getYear(), date.getMonthValue());
    }

    @Transactional
    public BulkUpdateResult bulkUpdate(BulkUpdateRequest request) {
        if (request.endDate().isBefore(request.startDate())) {
            throw ApiException.badRequest("End date must be on or after the start date");
        }
        if (ChronoUnit.DAYS.between(request.startDate(), request.endDate()) > MAX_BULK_RANGE_DAYS) {
            throw ApiException.badRequest("That date range is too large — please choose a smaller range");
        }

        AuthenticatedUser currentUser = CurrentUser.get();
        School school = schoolRepository.findById(currentUser.getSchoolId()).orElseThrow();
        DayStatus status = DayStatus.valueOf(request.status());

        int count = 0;
        for (LocalDate d = request.startDate(); !d.isAfter(request.endDate()); d = d.plusDays(1)) {
            if (request.dayOfWeek() != null && d.getDayOfWeek() != request.dayOfWeek()) continue;
            applyDayStatus(school, d, status, request.reason(), currentUser.getUserId());
            count++;
        }
        return new BulkUpdateResult(count);
    }

    private void applyDayStatus(School school, LocalDate date, DayStatus status, String reason, Long changedByUserId) {
        boolean matchesDefault = defaultStatus(school, date) == status && (reason == null || reason.isBlank());
        var existing = overrideRepository.findBySchoolIdAndDate(school.getId(), date);

        if (matchesDefault) {
            existing.ifPresent(overrideRepository::delete);
            return;
        }

        User changedBy = userRepository.findById(changedByUserId).orElse(null);
        CalendarDayOverride override = existing.orElseGet(() -> new CalendarDayOverride(school, date, status, reason, changedBy));
        override.setStatus(status);
        override.setReason(reason);
        override.setChangedBy(changedBy);
        override.setChangedAt(Instant.now());
        overrideRepository.save(override);
    }

    private DayStatus defaultStatus(School school, LocalDate date) {
        return school.getWeekendDays().contains(date.getDayOfWeek()) ? DayStatus.OFF : DayStatus.WORKING;
    }

    @Transactional(readOnly = true)
    public Set<DayOfWeek> getWeekendDays(Long schoolId) {
        return Set.copyOf(schoolRepository.findById(schoolId).orElseThrow().getWeekendDays());
    }

    @Transactional
    public Set<DayOfWeek> setWeekendDays(Set<DayOfWeek> weekendDays) {
        Long schoolId = CurrentUser.get().getSchoolId();
        School school = schoolRepository.findById(schoolId).orElseThrow();
        school.setWeekendDays(new HashSet<>(weekendDays));
        schoolRepository.save(school);
        return Set.copyOf(school.getWeekendDays());
    }
}
