package com.edutrack.profile.entity;

import com.edutrack.org.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "teacher_profile")
@Getter
@Setter
@NoArgsConstructor
public class TeacherProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String designation;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "profile_photo_ref")
    private String profilePhotoRef;

    private String phone;

    @Column(name = "cv_file_ref")
    private String cvFileRef;

    @Column(name = "cv_filename")
    private String cvFilename;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public TeacherProfile(User user) {
        this.user = user;
    }
}
