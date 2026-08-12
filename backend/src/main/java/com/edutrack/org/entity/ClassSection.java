package com.edutrack.org.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "class_section")
@Getter
@Setter
@NoArgsConstructor
public class ClassSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "class_name", nullable = false)
    private String className;

    @Column(name = "section_name")
    private String sectionName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    public ClassSection(String className, School school) {
        this.className = className;
        this.school = school;
    }

    public ClassSection(String className, String sectionName, School school) {
        this.className = className;
        this.sectionName = sectionName;
        this.school = school;
    }

    public boolean hasSection() {
        return sectionName != null && !sectionName.isBlank();
    }

    /** Human-facing label — "Grade 6" alone, or "Grade 6 — Violet" when this row represents a section. */
    public String getName() {
        return hasSection() ? className + " — " + sectionName : className;
    }
}
