package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.entity.Role;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.syllabus.dto.BulkDeleteResult;
import com.edutrack.syllabus.dto.ShiftTopicDatesResult;
import com.edutrack.syllabus.dto.TopicResponse;
import com.edutrack.syllabus.dto.TopicSearchResult;
import com.edutrack.syllabus.dto.TopicUpsertRequest;
import com.edutrack.syllabus.entity.Syllabus;
import com.edutrack.syllabus.entity.Topic;
import com.edutrack.syllabus.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TopicService {

    private final TopicRepository topicRepository;
    private final SyllabusService syllabusService;

    @Transactional(readOnly = true)
    public List<TopicResponse> listForSyllabus(Long syllabusId) {
        syllabusService.getOwned(syllabusId);
        return topicRepository.findBySyllabusIdOrderByOrderIndexAsc(syllabusId).stream().map(TopicResponse::from).toList();
    }

    @Transactional
    public TopicResponse create(Long syllabusId, TopicUpsertRequest request) {
        Syllabus syllabus = syllabusService.getOwned(syllabusId);
        int nextOrder = topicRepository.findBySyllabusIdOrderByOrderIndexAsc(syllabusId).size();
        Topic topic = new Topic(syllabus, request.title(), request.startWeek(), request.endWeek(),
                request.plannedStartDate(), request.plannedEndDate(), nextOrder);
        return TopicResponse.from(topicRepository.save(topic));
    }

    @Transactional
    public TopicResponse update(Long topicId, TopicUpsertRequest request) {
        Topic topic = getOwned(topicId);
        topic.setTitle(request.title());
        topic.setStartWeek(request.startWeek());
        topic.setEndWeek(request.endWeek());
        topic.setPlannedStartDate(request.plannedStartDate());
        topic.setPlannedEndDate(request.plannedEndDate());
        return TopicResponse.from(topicRepository.save(topic));
    }

    @Transactional
    public void delete(Long topicId) {
        Topic topic = getOwned(topicId);
        topicRepository.delete(topic);
    }

    @Transactional
    public BulkDeleteResult deleteMany(List<Long> topicIds) {
        List<Topic> topics = topicIds.stream().map(this::getOwned).toList();
        topicRepository.deleteAll(topics);
        return new BulkDeleteResult(topics.size());
    }

    @Transactional
    public List<TopicResponse> reorder(Long syllabusId, List<Long> orderedIds) {
        syllabusService.getOwned(syllabusId);
        List<Topic> topics = topicRepository.findAllById(orderedIds);
        for (int i = 0; i < orderedIds.size(); i++) {
            Long id = orderedIds.get(i);
            Topic topic = topics.stream().filter(t -> t.getId().equals(id)).findFirst()
                    .orElseThrow(() -> ApiException.notFound("Topic not found: " + id));
            if (!topic.getSyllabus().getId().equals(syllabusId)) {
                throw ApiException.badRequest("Topic does not belong to this syllabus: " + id);
            }
            topic.setOrderIndex(i);
        }
        return topicRepository.saveAll(topics).stream()
                .sorted((a, b) -> a.getOrderIndex().compareTo(b.getOrderIndex()))
                .map(TopicResponse::from).toList();
    }

    @Transactional
    public ShiftTopicDatesResult shiftDates(Long syllabusId, int days) {
        syllabusService.getOwned(syllabusId);
        List<Topic> topics = topicRepository.findBySyllabusIdOrderByOrderIndexAsc(syllabusId);
        for (Topic topic : topics) {
            topic.setPlannedStartDate(topic.getPlannedStartDate().plusDays(days));
            topic.setPlannedEndDate(topic.getPlannedEndDate().plusDays(days));
        }
        topicRepository.saveAll(topics);
        return new ShiftTopicDatesResult(topics.size());
    }

    private static final int MAX_SEARCH_RESULTS = 50;

    @Transactional(readOnly = true)
    public List<TopicSearchResult> search(String query) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }
        String needle = query.trim().toLowerCase();
        AuthenticatedUser user = CurrentUser.get();
        List<Topic> candidates = user.getRole() == Role.TEACHER
                ? topicRepository.findBySyllabusSubjectTeacherId(user.getUserId())
                : topicRepository.findBySyllabusSubjectClassSectionSchoolId(user.getSchoolId());

        return candidates.stream()
                .filter(t -> t.getTitle().toLowerCase().contains(needle))
                .sorted(Comparator.comparing(Topic::getPlannedStartDate).reversed())
                .limit(MAX_SEARCH_RESULTS)
                .map(TopicSearchResult::from)
                .toList();
    }

    private Topic getOwned(Long topicId) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> ApiException.notFound("Topic not found"));
        syllabusService.assertOwnsSubject(topic.getSyllabus().getSubject());
        return topic;
    }
}
