package com.edutrack.calendar.service;

import com.edutrack.calendar.dto.AddHolidayRequest;
import com.edutrack.calendar.dto.HolidayResponse;
import com.edutrack.calendar.dto.MonthViewResponse;
import com.edutrack.calendar.entity.SchoolHoliday;
import com.edutrack.calendar.repository.SchoolHolidayRepository;
import com.edutrack.common.ApiException;
import com.edutrack.org.entity.School;
import com.edutrack.org.repository.SchoolRepository;
import com.edutrack.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SchoolCalendarService {

    private final SchoolRepository schoolRepository;
    private final SchoolHolidayRepository holidayRepository;

    @Transactional(readOnly = true)
    public boolean isNonTeachingDay(Long schoolId, LocalDate date) {
        School school = schoolRepository.findById(schoolId).orElseThrow();
        if (school.getWeekendDays().contains(date.getDayOfWeek())) {
            return true;
        }
        return holidayRepository
                .findBySchoolIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(schoolId, date, date)
                .stream().anyMatch(h -> h.covers(date));
    }

    @Transactional(readOnly = true)
    public MonthViewResponse getMonthView(Long schoolId, int year, int month) {
        School school = schoolRepository.findById(schoolId).orElseThrow();
        YearMonth ym = YearMonth.of(year, month);
        LocalDate monthStart = ym.atDay(1);
        LocalDate monthEnd = ym.atEndOfMonth();

        List<HolidayResponse> holidays = holidayRepository
                .findBySchoolIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(schoolId, monthEnd, monthStart)
                .stream().map(HolidayResponse::from).toList();

        return new MonthViewResponse(year, month, Set.copyOf(school.getWeekendDays()), holidays);
    }

    @Transactional(readOnly = true)
    public List<HolidayResponse> listHolidays(Long schoolId) {
        return holidayRepository.findBySchoolIdOrderByStartDateAsc(schoolId).stream().map(HolidayResponse::from).toList();
    }

    @Transactional
    public HolidayResponse addHoliday(AddHolidayRequest request) {
        Long schoolId = CurrentUser.get().getSchoolId();
        if (request.endDate().isBefore(request.startDate())) {
            throw ApiException.badRequest("End date must be on or after the start date");
        }
        School school = schoolRepository.findById(schoolId).orElseThrow();
        SchoolHoliday holiday = new SchoolHoliday(school, request.name(), request.startDate(), request.endDate());
        return HolidayResponse.from(holidayRepository.save(holiday));
    }

    @Transactional
    public void deleteHoliday(Long holidayId) {
        SchoolHoliday holiday = holidayRepository.findById(holidayId)
                .orElseThrow(() -> ApiException.notFound("Holiday not found"));
        if (!holiday.getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Holiday not found");
        }
        holidayRepository.delete(holiday);
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
