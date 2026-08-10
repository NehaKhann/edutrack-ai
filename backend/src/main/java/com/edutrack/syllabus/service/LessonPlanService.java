package com.edutrack.syllabus.service;

import com.edutrack.calendar.service.SchoolCalendarService;
import com.edutrack.common.ApiException;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.Subject;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.syllabus.dto.LessonPlanEntryResponse;
import com.edutrack.syllabus.entity.LessonPlanEntry;
import com.edutrack.syllabus.entity.LessonPlanStatus;
import com.edutrack.syllabus.entity.Topic;
import com.edutrack.syllabus.repository.LessonPlanEntryRepository;
import com.edutrack.syllabus.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LessonPlanService {

    private final LessonPlanEntryRepository lessonPlanEntryRepository;
    private final TopicRepository topicRepository;
    private final SubjectRepository subjectRepository;
    private final UserRepository userRepository;
    private final SchoolCalendarService schoolCalendarService;

    private static final Set<LessonPlanStatus> OPEN_STATUSES = Set.of(LessonPlanStatus.PLANNED, LessonPlanStatus.RESCHEDULED);

    @Transactional
    public List<LessonPlanEntryResponse> getOrSuggestToday(Long subjectId, LocalDate date) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        AuthenticatedUser currentUser = assertOwnsSubject(subject);

        List<LessonPlanEntry> existing = lessonPlanEntryRepository
                .findByTeacherIdAndPlannedDateOrderByIdAsc(currentUser.getUserId(), date)
                .stream()
                .filter(e -> e.getTopic().getSyllabus().getSubject().getId().equals(subjectId))
                .toList();

        if (!existing.isEmpty()) {
            return existing.stream().map(LessonPlanEntryResponse::from).toList();
        }

        if (schoolCalendarService.isNonTeachingDay(currentUser.getSchoolId(), date)) {
            return List.of();
        }

        Topic suggestion = suggestNextTopic(subjectId, date);
        if (suggestion == null) {
            return List.of();
        }

        User teacher = userRepository.findById(currentUser.getUserId()).orElseThrow();
        LessonPlanEntry entry = new LessonPlanEntry(suggestion, teacher, date);
        entry = lessonPlanEntryRepository.save(entry);
        return List.of(LessonPlanEntryResponse.from(entry));
    }

    private Topic suggestNextTopic(Long subjectId, LocalDate date) {
        List<Topic> topics = topicRepository.findBySyllabusSubjectIdOrderByOrderIndexAsc(subjectId);
        return topics.stream()
                .filter(t -> !t.isCovered())
                .filter(t -> !t.getPlannedStartDate().isAfter(date))
                .findFirst()
                .or(() -> topics.stream().filter(t -> !t.isCovered()).findFirst())
                .orElse(null);
    }

    @Transactional
    public LessonPlanEntryResponse addEntry(Long subjectId, Long topicId, LocalDate plannedDate) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> ApiException.notFound("Subject not found"));
        AuthenticatedUser currentUser = assertOwnsSubject(subject);

        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> ApiException.notFound("Topic not found"));
        if (!topic.getSyllabus().getSubject().getId().equals(subjectId)) {
            throw ApiException.badRequest("Topic does not belong to this subject");
        }
        LocalDate date = plannedDate != null ? plannedDate : LocalDate.now();
        if (lessonPlanEntryRepository.findByTopicIdAndPlannedDate(topicId, date).isPresent()) {
            throw ApiException.conflict("This topic is already planned for that date");
        }
        User teacher = userRepository.findById(currentUser.getUserId()).orElseThrow();
        LessonPlanEntry entry = lessonPlanEntryRepository.save(new LessonPlanEntry(topic, teacher, date));
        return LessonPlanEntryResponse.from(entry);
    }

    @Transactional
    public LessonPlanEntryResponse updateEntryTopic(Long entryId, Long newTopicId) {
        LessonPlanEntry entry = getOwnedEntry(entryId);
        if (!OPEN_STATUSES.contains(entry.getStatus())) {
            throw ApiException.conflict("This lesson has already been confirmed and cannot be changed");
        }
        Topic newTopic = topicRepository.findById(newTopicId)
                .orElseThrow(() -> ApiException.notFound("Topic not found"));
        if (!newTopic.getSyllabus().getSubject().getId().equals(entry.getTopic().getSyllabus().getSubject().getId())) {
            throw ApiException.badRequest("Topic does not belong to this subject");
        }
        entry.setTopic(newTopic);
        return LessonPlanEntryResponse.from(lessonPlanEntryRepository.save(entry));
    }

    @Transactional
    public LessonPlanEntryResponse confirm(Long entryId, String statusValue, String reason) {
        LessonPlanEntry entry = getOwnedEntry(entryId);
        if (!OPEN_STATUSES.contains(entry.getStatus())) {
            throw ApiException.conflict("This lesson has already been confirmed");
        }

        LocalDate today = LocalDate.now();
        if ("COVERED".equals(statusValue)) {
            entry.setStatus(LessonPlanStatus.COVERED);
            entry.setActualDate(today);
            Topic topic = entry.getTopic();
            topic.setCovered(true);
            topic.setCoveredDate(today);
            topicRepository.save(topic);
        } else {
            entry.setStatus(LessonPlanStatus.MISSED);
            entry.setActualDate(today);
            entry.setReason(reason);
            rescheduleTopic(entry);
        }
        return LessonPlanEntryResponse.from(lessonPlanEntryRepository.save(entry));
    }

    private void rescheduleTopic(LessonPlanEntry missedEntry) {
        Topic topic = missedEntry.getTopic();
        Long schoolId = CurrentUser.get().getSchoolId();
        LocalDate candidate = missedEntry.getPlannedDate().plusDays(1);
        LocalDate cutoff = missedEntry.getPlannedDate().plusDays(30);
        while (candidate.isBefore(cutoff)
                && (schoolCalendarService.isNonTeachingDay(schoolId, candidate)
                        || lessonPlanEntryRepository.findByTopicIdAndPlannedDate(topic.getId(), candidate).isPresent())) {
            candidate = candidate.plusDays(1);
        }
        LessonPlanEntry rescheduled = new LessonPlanEntry(topic, missedEntry.getTeacher(), candidate);
        rescheduled.setStatus(LessonPlanStatus.RESCHEDULED);
        lessonPlanEntryRepository.save(rescheduled);
    }

    private LessonPlanEntry getOwnedEntry(Long entryId) {
        LessonPlanEntry entry = lessonPlanEntryRepository.findById(entryId)
                .orElseThrow(() -> ApiException.notFound("Lesson plan entry not found"));
        AuthenticatedUser currentUser = CurrentUser.get();
        Subject subject = entry.getTopic().getSyllabus().getSubject();
        if (!subject.getClassSection().getSchool().getId().equals(currentUser.getSchoolId())) {
            throw ApiException.notFound("Lesson plan entry not found");
        }
        if (currentUser.getRole() == Role.TEACHER && !entry.getTeacher().getId().equals(currentUser.getUserId())) {
            throw ApiException.forbidden("You can only manage your own lesson plan");
        }
        return entry;
    }

    private AuthenticatedUser assertOwnsSubject(Subject subject) {
        AuthenticatedUser user = CurrentUser.get();
        if (!subject.getClassSection().getSchool().getId().equals(user.getSchoolId())) {
            throw ApiException.notFound("Subject not found");
        }
        if (user.getRole() == Role.TEACHER && !subject.getTeacher().getId().equals(user.getUserId())) {
            throw ApiException.forbidden("You can only manage your own subjects");
        }
        return user;
    }
}
