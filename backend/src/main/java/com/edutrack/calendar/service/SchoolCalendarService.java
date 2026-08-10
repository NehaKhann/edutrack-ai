package com.edutrack.calendar.service;

import com.edutrack.calendar.dto.BulkUpdateRequest;
import com.edutrack.calendar.dto.BulkUpdateResult;
import com.edutrack.calendar.dto.DayOverrideResponse;
import com.edutrack.calendar.dto.MonthViewResponse;
import com.edutrack.calendar.dto.SetDayRequest;
import com.edutrack.calendar.entity.CalendarDayOverride;
import com.edutrack.calendar.entity.DayStatus;
import com.edutrack.calendar.repository.CalendarDayOverrideRepository;
import com.edutrack.common.ApiException;
import com.edutrack.org.entity.School;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.SchoolRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SchoolCalendarService {

    private static final long MAX_BULK_RANGE_DAYS = 730;

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;
    private final CalendarDayOverrideRepository overrideRepository;

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
        override.setChangedAt(java.time.Instant.now());
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
