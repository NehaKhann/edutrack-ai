package com.edutrack.syllabus.dto;

import java.util.List;

public record TopicExtractionResult(List<TopicResponse> topics, boolean weeksAdjusted) {
}
