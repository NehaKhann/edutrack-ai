package com.edutrack.config;

import com.edutrack.attendance.entity.StudentAttendanceRecord;
import com.edutrack.attendance.entity.StudentAttendanceStatus;
import com.edutrack.attendance.repository.StudentAttendanceRecordRepository;
import com.edutrack.calendar.entity.CalendarDayOverride;
import com.edutrack.calendar.entity.DayStatus;
import com.edutrack.calendar.repository.CalendarDayOverrideRepository;
import com.edutrack.calendar.repository.TeacherDayNoteRepository;
import com.edutrack.diary.repository.DiaryEntryRepository;
import com.edutrack.face.repository.TeacherFaceEmbeddingRepository;
import com.edutrack.org.entity.ClassSection;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.School;
import com.edutrack.org.entity.Student;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.ClassSectionRepository;
import com.edutrack.org.repository.SchoolRepository;
import com.edutrack.org.repository.StudentRepository;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.profile.entity.TeacherProfile;
import com.edutrack.profile.repository.TeacherProfileRepository;
import com.edutrack.staffattendance.entity.AttendanceMethod;
import com.edutrack.staffattendance.entity.LeaveRequest;
import com.edutrack.staffattendance.entity.LeaveStatus;
import com.edutrack.staffattendance.entity.LeaveType;
import com.edutrack.staffattendance.entity.SkippedClassReport;
import com.edutrack.staffattendance.entity.TeacherAttendanceRecord;
import com.edutrack.staffattendance.entity.TeacherAttendanceStatus;
import com.edutrack.staffattendance.repository.LeaveRequestRepository;
import com.edutrack.staffattendance.repository.SkippedClassReportRepository;
import com.edutrack.staffattendance.repository.TeacherAttendanceRecordRepository;
import com.edutrack.syllabus.repository.LessonPlanEntryRepository;
import com.edutrack.syllabus.repository.SyllabusDocumentRepository;
import com.edutrack.syllabus.repository.SyllabusRepository;
import com.edutrack.syllabus.repository.TopicRepository;
import com.edutrack.timetable.entity.TimetableEntry;
import com.edutrack.timetable.repository.TimetableEntryRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * One-time demo data reset: wipes every transactional table (attendance, leave, skip reports,
 * subjects, class-sections, students, timetable, syllabus/diary) and rebuilds a rich, realistic
 * dataset, WITHOUT touching any existing app_user row (no logins are deleted, renamed, or
 * repasswrded). Only runs when reset.demo.data=true. Meant to be removed once run.
 */
@Component
@Order(10)
@RequiredArgsConstructor
public class DemoDataResetSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataResetSeeder.class);
    private static final String DEMO_PASSWORD = "Password123!";

    private final SchoolRepository schoolRepository;
    private final UserRepository userRepository;
    private final ClassSectionRepository classSectionRepository;
    private final SubjectRepository subjectRepository;
    private final StudentRepository studentRepository;
    private final StudentAttendanceRecordRepository studentAttendanceRecordRepository;
    private final TeacherAttendanceRecordRepository teacherAttendanceRecordRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final SkippedClassReportRepository skippedClassReportRepository;
    private final TimetableEntryRepository timetableEntryRepository;
    private final TeacherProfileRepository teacherProfileRepository;
    private final DiaryEntryRepository diaryEntryRepository;
    private final LessonPlanEntryRepository lessonPlanEntryRepository;
    private final TopicRepository topicRepository;
    private final SyllabusDocumentRepository syllabusDocumentRepository;
    private final SyllabusRepository syllabusRepository;
    private final CalendarDayOverrideRepository calendarDayOverrideRepository;
    private final TeacherDayNoteRepository teacherDayNoteRepository;
    private final TeacherFaceEmbeddingRepository teacherFaceEmbeddingRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${reset.demo.data:false}")
    private boolean resetEnabled;

    private final Random random = new Random(42);

    @Override
    @Transactional
    public void run(String... args) {
        if (!resetEnabled) {
            return;
        }
        if (schoolRepository.count() == 0) {
            log.warn("reset.demo.data=true but no school exists yet — skipping (let DataSeeder run first).");
            return;
        }

        log.info("========================================================");
        log.info(" Resetting EduTrack AI demo data...");

        School school = schoolRepository.findAll().get(0);

        wipeTransactionalData();

        Map<String, User> teachers = ensureTeachers(school);
        Map<String, ClassSection> units = createClassSections(school);
        Map<String, List<Subject>> subjectsByUnit = createSubjects(units, teachers);
        Map<String, List<Student>> studentsByUnit = createStudents(units);

        markStudentAttendance(studentsByUnit, subjectsByUnit);
        markTeacherAttendance(teachers, subjectsByUnit);
        buildTimetables(units, subjectsByUnit);
        refreshCalendar(school);

        log.info(" Demo data reset complete for '{}'.", school.getName());
        log.info(" All existing logins are unchanged. New teacher logins (password: {}):", DEMO_PASSWORD);
        for (String key : List.of("saima", "aisha", "usman", "farah", "hassan")) {
            log.info("   {}", teachers.get(key).getEmail());
        }
        log.info("========================================================");
    }

    // ---------------------------------------------------------------- wipe

    private void wipeTransactionalData() {
        studentAttendanceRecordRepository.deleteAll();
        skippedClassReportRepository.deleteAll();
        leaveRequestRepository.deleteAll();
        teacherAttendanceRecordRepository.deleteAll();
        diaryEntryRepository.deleteAll();
        lessonPlanEntryRepository.deleteAll();
        topicRepository.deleteAll();
        syllabusDocumentRepository.deleteAll();
        syllabusRepository.deleteAll();
        teacherDayNoteRepository.deleteAll();
        timetableEntryRepository.deleteAll();
        teacherFaceEmbeddingRepository.deleteAll();
        studentRepository.deleteAll();
        subjectRepository.deleteAll();
        classSectionRepository.deleteAll();
        calendarDayOverrideRepository.deleteAll();
        log.info(" Cleared existing subjects, classes/sections, students, timetable, attendance, leave, diary, and syllabus data.");
    }

    // ---------------------------------------------------------------- teachers

    private Map<String, User> ensureTeachers(School school) {
        Map<String, User> teachers = new LinkedHashMap<>();
        userRepository.findAll().forEach(u -> {
            if (u.getRole() == Role.TEACHER) {
                if (u.getEmail().equals("sana.tariq@edutrack.school")) teachers.put("sana", u);
                if (u.getEmail().equals("bilal.ahmed@edutrack.school")) teachers.put("bilal", u);
            }
        });

        record NewTeacher(String key, String name, String email, String designation, String bio) {}
        List<NewTeacher> toCreate = List.of(
                new NewTeacher("saima", "Saima Khalid", "saima.khalid@edutrack.school",
                        "English & Mathematics Teacher", "Passionate about making core subjects engaging for younger grades."),
                new NewTeacher("aisha", "Aisha Raza", "aisha.raza@edutrack.school",
                        "Pakistan Studies Teacher", "Believes in bringing history and civics to life through storytelling."),
                new NewTeacher("usman", "Usman Malik", "usman.malik@edutrack.school",
                        "Science Teacher", "Loves hands-on experiments and encourages curiosity in the classroom."),
                new NewTeacher("farah", "Farah Siddiqui", "farah.siddiqui@edutrack.school",
                        "Urdu & Islamiyat Teacher", "Twelve years of experience nurturing language and values."),
                new NewTeacher("hassan", "Hassan Iqbal", "hassan.iqbal@edutrack.school",
                        "Senior Subject Coordinator", "Covers Mathematics and Science across the senior classes.")
        );

        for (NewTeacher nt : toCreate) {
            User existing = userRepository.findAll().stream()
                    .filter(u -> u.getEmail().equals(nt.email()))
                    .findFirst().orElse(null);
            User user = existing != null ? existing
                    : userRepository.save(new User(nt.name(), nt.email(), passwordEncoder.encode(DEMO_PASSWORD), Role.TEACHER, school));
            teachers.put(nt.key(), user);

            TeacherProfile profile = teacherProfileRepository.findByUserId(user.getId()).orElseGet(() -> new TeacherProfile(user));
            profile.setDesignation(nt.designation());
            profile.setBio(nt.bio());
            profile.setUpdatedAt(Instant.now());
            teacherProfileRepository.save(profile);
        }

        // Keep Sana & Bilal's existing profile if present; otherwise give them one too.
        for (String key : List.of("sana", "bilal")) {
            User u = teachers.get(key);
            if (u != null && teacherProfileRepository.findByUserId(u.getId()).isEmpty()) {
                TeacherProfile profile = new TeacherProfile(u);
                profile.setDesignation(key.equals("sana") ? "Senior Mathematics Teacher" : "English & Urdu Teacher");
                profile.setBio("Long-standing member of the teaching staff.");
                teacherProfileRepository.save(profile);
            }
        }

        return teachers;
    }

    // ---------------------------------------------------------------- classes & sections

    private Map<String, ClassSection> createClassSections(School school) {
        Map<String, ClassSection> units = new LinkedHashMap<>();
        units.put("c4", classSectionRepository.save(new ClassSection("Class 4", school)));
        units.put("c5v", classSectionRepository.save(new ClassSection("Class 5", "Violet", school)));
        units.put("c5i", classSectionRepository.save(new ClassSection("Class 5", "Indigo", school)));
        units.put("c6", classSectionRepository.save(new ClassSection("Class 6", school)));
        units.put("c7v", classSectionRepository.save(new ClassSection("Class 7", "Violet", school)));
        units.put("c7i", classSectionRepository.save(new ClassSection("Class 7", "Indigo", school)));
        return units;
    }

    // ---------------------------------------------------------------- subjects

    private Map<String, List<Subject>> createSubjects(Map<String, ClassSection> units, Map<String, User> teachers) {
        record Assignment(String unit, String subject, String teacher) {}
        List<Assignment> matrix = List.of(
                new Assignment("c4", "Mathematics", "saima"),
                new Assignment("c4", "English", "saima"),
                new Assignment("c4", "Urdu", "usman"),
                new Assignment("c4", "Science", "sana"),
                new Assignment("c4", "Islamiyat", "farah"),

                new Assignment("c5v", "Mathematics", "sana"),
                new Assignment("c5v", "English", "saima"),
                new Assignment("c5v", "Urdu", "farah"),
                new Assignment("c5v", "Science", "usman"),
                new Assignment("c5v", "Islamiyat", "aisha"),

                new Assignment("c5i", "Mathematics", "sana"),
                new Assignment("c5i", "English", "hassan"),
                new Assignment("c5i", "Urdu", "farah"),
                new Assignment("c5i", "Science", "usman"),
                new Assignment("c5i", "Islamiyat", "hassan"),

                new Assignment("c6", "Mathematics", "hassan"),
                new Assignment("c6", "English", "bilal"),
                new Assignment("c6", "Urdu", "usman"),
                new Assignment("c6", "Science", "usman"),
                new Assignment("c6", "Islamiyat", "farah"),
                new Assignment("c6", "Pakistan Studies", "aisha"),

                new Assignment("c7v", "Mathematics", "hassan"),
                new Assignment("c7v", "English", "farah"),
                new Assignment("c7v", "Urdu", "bilal"),
                new Assignment("c7v", "Science", "hassan"),
                new Assignment("c7v", "Islamiyat", "aisha"),
                new Assignment("c7v", "Pakistan Studies", "aisha"),

                new Assignment("c7i", "Mathematics", "hassan"),
                new Assignment("c7i", "English", "farah"),
                new Assignment("c7i", "Urdu", "bilal"),
                new Assignment("c7i", "Science", "usman"),
                new Assignment("c7i", "Islamiyat", "aisha"),
                new Assignment("c7i", "Pakistan Studies", "aisha")
        );

        Map<String, List<Subject>> byUnit = new LinkedHashMap<>();
        for (Assignment a : matrix) {
            ClassSection unit = units.get(a.unit());
            User teacher = teachers.get(a.teacher());
            Subject saved = subjectRepository.save(new Subject(a.subject(), unit, teacher));
            byUnit.computeIfAbsent(a.unit(), k -> new ArrayList<>()).add(saved);
        }
        return byUnit;
    }

    // ---------------------------------------------------------------- students

    private static final String[] MALE_FIRST_NAMES = {
            "Ahmed", "Ali", "Hassan", "Bilal", "Usman", "Hamza", "Zain", "Faisal", "Danish", "Fahad",
            "Imran", "Kashif", "Saad", "Talha", "Umer", "Waleed", "Yasir", "Zeeshan", "Adeel", "Asad",
            "Farhan", "Haris", "Junaid", "Kamran", "Moiz", "Naveed", "Omer", "Rayyan", "Shahzad", "Ibrahim"
    };
    private static final String[] FEMALE_FIRST_NAMES = {
            "Ayesha", "Fatima", "Mahnoor", "Zara", "Amna", "Hira", "Sana", "Iqra", "Laiba", "Mariam",
            "Noor", "Rabia", "Sadia", "Tania", "Areeba", "Bushra", "Dua", "Eman", "Fiza", "Hina",
            "Javeria", "Kiran", "Mehak", "Nida", "Rimsha", "Sara", "Tehmina", "Warda", "Alishba", "Anaya"
    };
    private static final String[] SURNAMES = {
            "Khan", "Ahmed", "Malik", "Raza", "Iqbal", "Siddiqui", "Hussain", "Sheikh", "Butt", "Chaudhry",
            "Farooq", "Qureshi", "Baig", "Abbasi", "Awan", "Bhatti", "Cheema", "Dar", "Gill", "Hashmi",
            "Javed", "Kazmi", "Lodhi", "Mirza", "Nawaz", "Pasha", "Rashid", "Shah", "Tariq", "Zafar"
    };

    private Map<String, List<Student>> createStudents(Map<String, ClassSection> units) {
        Map<String, List<Student>> byUnit = new LinkedHashMap<>();
        for (Map.Entry<String, ClassSection> entry : units.entrySet()) {
            List<Student> roster = new ArrayList<>();
            Set<String> usedNames = new HashSet<>();
            List<Integer> maleIdx = shuffledIndices(MALE_FIRST_NAMES.length);
            List<Integer> femaleIdx = shuffledIndices(FEMALE_FIRST_NAMES.length);
            List<Integer> surnameIdx = shuffledIndices(SURNAMES.length);
            int mPtr = 0, fPtr = 0, sPtr = 0;

            for (int roll = 1; roll <= 30; roll++) {
                boolean male = roll % 2 == 1;
                String first;
                if (male) {
                    first = MALE_FIRST_NAMES[maleIdx.get(mPtr++ % maleIdx.size())];
                } else {
                    first = FEMALE_FIRST_NAMES[femaleIdx.get(fPtr++ % femaleIdx.size())];
                }
                String last = SURNAMES[surnameIdx.get(sPtr++ % surnameIdx.size())];
                String fullName = first + " " + last;
                int guard = 0;
                while (usedNames.contains(fullName) && guard++ < 10) {
                    last = SURNAMES[surnameIdx.get(sPtr++ % surnameIdx.size())];
                    fullName = first + " " + last;
                }
                usedNames.add(fullName);
                roster.add(studentRepository.save(new Student(entry.getValue(), fullName, String.valueOf(roll))));
            }
            byUnit.put(entry.getKey(), roster);
        }
        return byUnit;
    }

    private List<Integer> shuffledIndices(int size) {
        List<Integer> list = new ArrayList<>();
        for (int i = 0; i < size; i++) list.add(i);
        java.util.Collections.shuffle(list, random);
        return list;
    }

    // ---------------------------------------------------------------- attendance

    private void markStudentAttendance(Map<String, List<Student>> studentsByUnit, Map<String, List<Subject>> subjectsByUnit) {
        LocalDate today = LocalDate.now();
        int daysMarked = 0;
        int recordsSaved = 0;
        for (int offset = 6; offset >= 0; offset--) {
            LocalDate date = today.minusDays(offset);
            DayOfWeek dow = date.getDayOfWeek();
            if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) continue;
            daysMarked++;
            for (Map.Entry<String, List<Student>> entry : studentsByUnit.entrySet()) {
                List<Student> roster = entry.getValue();
                User marker = subjectsByUnit.get(entry.getKey()).get(0).getTeacher();
                for (Student s : roster) {
                    double r = random.nextDouble();
                    StudentAttendanceStatus status = r < 0.85 ? StudentAttendanceStatus.PRESENT
                            : r < 0.95 ? StudentAttendanceStatus.ABSENT
                            : StudentAttendanceStatus.LEAVE;
                    studentAttendanceRecordRepository.save(
                            new StudentAttendanceRecord(s, s.getClassSection(), null, null, date, status, marker));
                    recordsSaved++;
                }
            }
        }
        log.info(" Marked attendance for {} students across the last {} school days ({} records).",
                studentsByUnit.values().stream().mapToInt(List::size).sum(), daysMarked, recordsSaved);
    }

    private void markTeacherAttendance(Map<String, User> teachers, Map<String, List<Subject>> subjectsByUnit) {
        LocalDate today = LocalDate.now();
        List<String> presentKeys = List.of("sana", "bilal", "saima", "usman", "hassan");
        for (String key : presentKeys) {
            teacherAttendanceRecordRepository.save(
                    new TeacherAttendanceRecord(teachers.get(key), today, TeacherAttendanceStatus.PRESENT, AttendanceMethod.MANUAL));
        }

        // Absent, no leave submitted.
        teacherAttendanceRecordRepository.save(
                new TeacherAttendanceRecord(teachers.get("farah"), today, TeacherAttendanceStatus.ABSENT, AttendanceMethod.MANUAL));

        // Absent, with an approved leave request covering today.
        teacherAttendanceRecordRepository.save(
                new TeacherAttendanceRecord(teachers.get("aisha"), today, TeacherAttendanceStatus.ABSENT, AttendanceMethod.MANUAL));
        LeaveRequest leave = new LeaveRequest(teachers.get("aisha"), LeaveType.SICK, today, today, "Fever and body ache — advised rest by doctor.");
        leave.setStatus(LeaveStatus.APPROVED);
        leave.setReviewedBy(teachers.get("bilal")); // stand-in reviewer; principal review happens via API normally
        leave.setReviewedAt(Instant.now());
        leaveRequestRepository.save(leave);

        // A present teacher who skipped one period for a school activity.
        Subject hassanSubject = subjectsByUnit.get("c7v").stream()
                .filter(s -> s.getTeacher().getId().equals(teachers.get("hassan").getId()))
                .findFirst().orElse(subjectsByUnit.get("c7v").get(0));
        SkippedClassReport skip = new SkippedClassReport(teachers.get("hassan"), hassanSubject, today, 3,
                "Assisting with Annual Sports Day preparations in the school ground.");
        skip.setSubstituteTeacher(teachers.get("usman"));
        skippedClassReportRepository.save(skip);

        log.info(" Marked teacher attendance: 5 present, 1 absent (no leave), 1 absent (with leave), 1 school-activity skip.");
    }

    // ---------------------------------------------------------------- timetable

    private static final DayOfWeek[] WEEKDAYS = {DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY};
    private static final int PERIODS_PER_DAY = 6;

    private void buildTimetables(Map<String, ClassSection> units, Map<String, List<Subject>> subjectsByUnit) {
        List<String> unitKeys = new ArrayList<>(units.keySet());
        Map<Long, Set<Integer>> teacherBusy = new HashMap<>();
        int entryCount = 0;

        for (int day = 0; day < WEEKDAYS.length; day++) {
            for (int period = 1; period <= PERIODS_PER_DAY; period++) {
                int slot = day * 100 + period;
                // Rotate which unit gets first pick at this slot so no single class always wins ties.
                int rotation = (day * PERIODS_PER_DAY + period) % unitKeys.size();
                for (int u = 0; u < unitKeys.size(); u++) {
                    String unitKey = unitKeys.get((rotation + u) % unitKeys.size());
                    List<Subject> subjects = subjectsByUnit.get(unitKey);
                    int n = subjects.size();
                    int startIdx = (day * PERIODS_PER_DAY + period) % n;

                    Subject chosen = null;
                    for (int i = 0; i < n; i++) {
                        Subject candidate = subjects.get((startIdx + i) % n);
                        Long teacherId = candidate.getTeacher().getId();
                        Set<Integer> busySlots = teacherBusy.computeIfAbsent(teacherId, k -> new HashSet<>());
                        if (!busySlots.contains(slot)) {
                            chosen = candidate;
                            break;
                        }
                    }
                    if (chosen == null) {
                        chosen = subjects.get(startIdx);
                    }

                    TimetableEntry tt = new TimetableEntry(units.get(unitKey), WEEKDAYS[day], period);
                    tt.setSubject(chosen);
                    tt.setTeacher(chosen.getTeacher());
                    timetableEntryRepository.save(tt);
                    teacherBusy.computeIfAbsent(chosen.getTeacher().getId(), k -> new HashSet<>()).add(slot);
                    entryCount++;
                }
            }
        }
        log.info(" Built {} timetable periods across {} classes/sections ({} days x {} periods).",
                entryCount, unitKeys.size(), WEEKDAYS.length, PERIODS_PER_DAY);
    }

    // ---------------------------------------------------------------- calendar

    private void refreshCalendar(School school) {
        User principal = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.PRINCIPAL)
                .findFirst().orElse(null);
        if (principal == null) return;

        LocalDate today = LocalDate.now();
        calendarDayOverrideRepository.save(new CalendarDayOverride(school, today.plusDays(5), DayStatus.OFF, "Public Holiday", principal));
        for (LocalDate d = today.plusDays(20); !d.isAfter(today.plusDays(26)); d = d.plusDays(1)) {
            calendarDayOverrideRepository.save(new CalendarDayOverride(school, d, DayStatus.OFF, "Mid-Term Break", principal));
        }
        LocalDate upcomingSaturday = today.with(TemporalAdjusters.next(DayOfWeek.SATURDAY));
        calendarDayOverrideRepository.save(new CalendarDayOverride(school, upcomingSaturday, DayStatus.WORKING, "Makeup day", principal));
        calendarDayOverrideRepository.save(new CalendarDayOverride(school, today.plusDays(12), DayStatus.EXAM, "Mid-term exams begin", principal));
    }
}
