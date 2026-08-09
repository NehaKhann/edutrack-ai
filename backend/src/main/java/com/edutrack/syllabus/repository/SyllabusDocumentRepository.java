package com.edutrack.syllabus.repository;

import com.edutrack.syllabus.entity.SyllabusDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SyllabusDocumentRepository extends JpaRepository<SyllabusDocument, Long> {
    List<SyllabusDocument> findBySyllabusIdOrderByOrderIndexAsc(Long syllabusId);
    long countBySyllabusId(Long syllabusId);
}
