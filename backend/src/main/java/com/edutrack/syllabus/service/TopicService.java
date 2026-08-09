package com.edutrack.syllabus.service;

import com.edutrack.common.ApiException;
import com.edutrack.syllabus.dto.TopicResponse;
import com.edutrack.syllabus.dto.TopicUpsertRequest;
import com.edutrack.syllabus.entity.Syllabus;
import com.edutrack.syllabus.entity.Topic;
import com.edutrack.syllabus.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TopicService {

    private final TopicRepository topicRepository;
    private final SyllabusService syllabusService;

    public List<TopicResponse> listForSyllabus(Long syllabusId) {
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
    public List<TopicResponse> reorder(Long syllabusId, List<Long> orderedIds) {
        syllabusService.getOwned(syllabusId);
        List<Topic> topics = topicRepository.findAllById(orderedIds);
        for (int i = 0; i < orderedIds.size(); i++) {
            Long id = orderedIds.get(i);
            Topic topic = topics.stream().filter(t -> t.getId().equals(id)).findFirst()
                    .orElseThrow(() -> ApiException.notFound("Topic not found: " + id));
            topic.setOrderIndex(i);
        }
        return topicRepository.saveAll(topics).stream()
                .sorted((a, b) -> a.getOrderIndex().compareTo(b.getOrderIndex()))
                .map(TopicResponse::from).toList();
    }

    private Topic getOwned(Long topicId) {
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> ApiException.notFound("Topic not found"));
        syllabusService.assertOwnsSubject(topic.getSyllabus().getSubject());
        return topic;
    }
}
