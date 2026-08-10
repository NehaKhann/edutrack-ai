package com.edutrack.config;

import com.edutrack.calendar.entity.CalendarDayOverride;
import com.edutrack.calendar.entity.DayStatus;
import com.edutrack.calendar.repository.CalendarDayOverrideRepository;
import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.School;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.org.repository.SchoolRepository;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.org.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final String DEMO_PASSWORD = "Password123!";

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;
    private final ClassSectionRepository classSectionRepository;
    private final SubjectRepository subjectRepository;
    private final CalendarDayOverrideRepository calendarDayOverrideRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${seed.enabled:true}")
    private boolean seedEnabled;

    @Override
    public void run(String... args) {
        if (!seedEnabled || schoolRepository.count() > 0) {
            return;
        }

        School school = new School("Greenwood Public School");
        school.setWeekendDays(Set.of(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY));
        school = schoolRepository.save(school);

        User admin = userRepository.save(new User("Admin", "admin@edutrack.school",
                passwordEncoder.encode(DEMO_PASSWORD), Role.ADMIN, school));
        User principal = userRepository.save(new User("Ayesha Malik", "principal@edutrack.school",
                passwordEncoder.encode(DEMO_PASSWORD), Role.PRINCIPAL, school));
        User teacherSana = userRepository.save(new User("Sana Tariq", "sana.tariq@edutrack.school",
                passwordEncoder.encode(DEMO_PASSWORD), Role.TEACHER, school));
        User teacherBilal = userRepository.save(new User("Bilal Ahmed", "bilal.ahmed@edutrack.school",
                passwordEncoder.encode(DEMO_PASSWORD), Role.TEACHER, school));

        ClassSection grade6 = classSectionRepository.save(new ClassSection("Grade 6", school));
        ClassSection grade7 = classSectionRepository.save(new ClassSection("Grade 7", school));

        subjectRepository.save(new Subject("Mathematics", grade6, teacherSana));
        subjectRepository.save(new Subject("English", grade6, teacherBilal));
        subjectRepository.save(new Subject("Mathematics", grade7, teacherSana));
        subjectRepository.save(new Subject("Urdu", grade7, teacherBilal));

        LocalDate today = LocalDate.now();
        calendarDayOverrideRepository.save(new CalendarDayOverride(school, today.plusDays(5), DayStatus.OFF, "Public Holiday", principal));
        for (LocalDate d = today.plusDays(20); !d.isAfter(today.plusDays(26)); d = d.plusDays(1)) {
            calendarDayOverrideRepository.save(new CalendarDayOverride(school, d, DayStatus.OFF, "Mid-Term Break", principal));
        }
        // Demonstrate the "exception" case too: a working Saturday, e.g. a makeup day.
        LocalDate upcomingSaturday = today.with(java.time.temporal.TemporalAdjusters.next(DayOfWeek.SATURDAY));
        calendarDayOverrideRepository.save(new CalendarDayOverride(school, upcomingSaturday, DayStatus.WORKING, "Makeup day", principal));

        log.info("========================================================");
        log.info(" EduTrack AI demo data seeded for '{}'", school.getName());
        log.info(" Sign in at the frontend with any of these accounts (password: {}):", DEMO_PASSWORD);
        log.info("   Admin:      {}", admin.getEmail());
        log.info("   Principal:  {}", principal.getEmail());
        log.info("   Teacher:    {} (Mathematics - Grade 6 & 7)", teacherSana.getEmail());
        log.info("   Teacher:    {} (English - Grade 6, Urdu - Grade 7)", teacherBilal.getEmail());
        log.info("========================================================");
    }
}
