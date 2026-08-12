package com.edutrack.profile.service;

import com.edutrack.common.ApiException;
import com.edutrack.notification.service.NotificationService;
import com.edutrack.org.dto.SubjectResponse;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.School;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.profile.dto.TeacherAccountResponse;
import com.edutrack.profile.dto.TeacherDirectoryEntry;
import com.edutrack.profile.dto.TeacherProfileResponse;
import com.edutrack.profile.dto.TeacherProfileUpdateRequest;
import com.edutrack.profile.entity.TeacherProfile;
import com.edutrack.profile.repository.TeacherProfileRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TeacherProfileService {

    private static final List<String> ALLOWED_PHOTO_TYPES = List.of("image/jpeg", "image/png", "image/webp");
    private static final List<String> ALLOWED_CV_TYPES = List.of(
            "application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final TeacherProfileRepository teacherProfileRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final FileStorageService fileStorageService;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public TeacherProfileResponse getMyProfile() {
        return buildResponse(currentTeacherId());
    }

    @Transactional(readOnly = true)
    public TeacherProfileResponse getProfileFor(Long teacherId) {
        assertSameSchool(teacherId);
        return buildResponse(teacherId);
    }

    @Transactional
    public TeacherProfileResponse updateMyProfile(TeacherProfileUpdateRequest request) {
        Long teacherId = currentTeacherId();
        TeacherProfile profile = getOrCreate(teacherId);
        profile.setDesignation(request.designation());
        profile.setBio(request.bio());
        if (request.phone() != null) {
            profile.setPhone(request.phone());
        }
        profile.setUpdatedAt(Instant.now());
        teacherProfileRepository.save(profile);
        return buildResponse(teacherId);
    }

    @Transactional
    public TeacherProfileResponse uploadMyPhoto(MultipartFile file) {
        if (file.isEmpty() || file.getContentType() == null || !ALLOWED_PHOTO_TYPES.contains(file.getContentType())) {
            throw ApiException.badRequest("Please upload a JPG, PNG, or WebP image for your profile photo");
        }
        Long teacherId = currentTeacherId();
        TeacherProfile profile = getOrCreate(teacherId);
        String oldRef = profile.getProfilePhotoRef();
        String ref = fileStorageService.store(file, "profile-photos");
        profile.setProfilePhotoRef(ref);
        if (oldRef != null) {
            fileStorageService.delete(oldRef);
        }
        profile.setUpdatedAt(Instant.now());
        teacherProfileRepository.save(profile);
        return buildResponse(teacherId);
    }

    @Transactional(readOnly = true)
    public byte[] getPhotoBytes(Long teacherId) {
        assertSameSchool(teacherId);
        TeacherProfile profile = teacherProfileRepository.findByUserId(teacherId)
                .orElseThrow(() -> ApiException.notFound("No profile photo set"));
        if (profile.getProfilePhotoRef() == null) {
            throw ApiException.notFound("No profile photo set");
        }
        return fileStorageService.load(profile.getProfilePhotoRef());
    }

    @Transactional(readOnly = true)
    public String getPhotoContentType(Long teacherId) {
        assertSameSchool(teacherId);
        TeacherProfile profile = teacherProfileRepository.findByUserId(teacherId)
                .orElseThrow(() -> ApiException.notFound("No profile photo set"));
        String ref = profile.getProfilePhotoRef();
        if (ref == null) throw ApiException.notFound("No profile photo set");
        String lower = ref.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        return "image/jpeg";
    }

    @Transactional(readOnly = true)
    public byte[] getCvBytes(Long teacherId) {
        assertSameSchool(teacherId);
        TeacherProfile profile = teacherProfileRepository.findByUserId(teacherId)
                .orElseThrow(() -> ApiException.notFound("No CV uploaded"));
        if (profile.getCvFileRef() == null) {
            throw ApiException.notFound("No CV uploaded");
        }
        return fileStorageService.load(profile.getCvFileRef());
    }

    @Transactional(readOnly = true)
    public String getCvFilename(Long teacherId) {
        assertSameSchool(teacherId);
        return teacherProfileRepository.findByUserId(teacherId)
                .map(TeacherProfile::getCvFilename)
                .orElse("cv");
    }

    @Transactional(readOnly = true)
    public List<TeacherDirectoryEntry> listDirectory() {
        Long schoolId = CurrentUser.get().getSchoolId();
        return toDirectoryEntries(userRepository.findBySchoolIdAndRoleAndActive(schoolId, Role.TEACHER, true));
    }

    @Transactional(readOnly = true)
    public List<TeacherDirectoryEntry> listInactiveDirectory() {
        Long schoolId = CurrentUser.get().getSchoolId();
        return toDirectoryEntries(userRepository.findBySchoolIdAndRoleAndActive(schoolId, Role.TEACHER, false));
    }

    @Transactional(readOnly = true)
    public List<TeacherAccountResponse> listAccounts() {
        Long schoolId = CurrentUser.get().getSchoolId();
        return userRepository.findBySchoolIdAndRoleAndActive(schoolId, Role.TEACHER, true).stream()
                .map(teacher -> TeacherAccountResponse.from(teacher, teacherProfileRepository.findByUserId(teacher.getId()).orElse(null)))
                .toList();
    }

    @Transactional
    public TeacherAccountResponse createTeacherAccount(String name, String email, String phone, MultipartFile cv) {
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists");
        }
        if (cv != null && !cv.isEmpty()) {
            if (cv.getContentType() == null || !ALLOWED_CV_TYPES.contains(cv.getContentType())) {
                throw ApiException.badRequest("Please upload the CV as a PDF or Word document");
            }
        }

        School school = userRepository.findById(CurrentUser.get().getUserId())
                .map(User::getSchool)
                .orElseThrow(() -> ApiException.notFound("School not found"));

        String tempPassword = generateTempPassword();
        User teacher = new User(name.trim(), email.trim().toLowerCase(), passwordEncoder.encode(tempPassword), Role.TEACHER, school);
        teacher.setTempPassword(tempPassword);
        teacher = userRepository.save(teacher);

        TeacherProfile profile = new TeacherProfile(teacher);
        if (phone != null && !phone.isBlank()) {
            profile.setPhone(phone.trim());
        }
        if (cv != null && !cv.isEmpty()) {
            String ref = fileStorageService.store(cv, "teacher-cvs");
            profile.setCvFileRef(ref);
            profile.setCvFilename(cv.getOriginalFilename());
        }
        teacherProfileRepository.save(profile);

        return TeacherAccountResponse.from(teacher, profile);
    }

    @Transactional
    public void changeMyPassword(String currentPassword, String newPassword) {
        Long teacherId = currentTeacherId();
        User teacher = userRepository.findById(teacherId).orElseThrow(() -> ApiException.notFound("Teacher not found"));
        if (!passwordEncoder.matches(currentPassword, teacher.getPasswordHash())) {
            throw ApiException.badRequest("Current password is incorrect");
        }
        boolean wasFirstChange = teacher.getTempPassword() != null;
        teacher.setPasswordHash(passwordEncoder.encode(newPassword));
        teacher.setTempPassword(null);
        userRepository.save(teacher);

        if (wasFirstChange) {
            userRepository.findBySchoolIdAndRole(teacher.getSchool().getId(), Role.PRINCIPAL)
                    .forEach(principal -> notificationService.notify(principal,
                            "Teacher " + teacher.getName() + " has successfully logged in and changed the password."));
        }
    }

    @Transactional
    public void deactivateTeacher(Long teacherId) {
        User teacher = findTeacherInSchool(teacherId);
        teacher.setActive(false);
        userRepository.save(teacher);
    }

    @Transactional
    public void reactivateTeacher(Long teacherId) {
        User teacher = findTeacherInSchool(teacherId);
        teacher.setActive(true);
        userRepository.save(teacher);
    }

    private String generateTempPassword() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            sb.append(TEMP_PASSWORD_CHARS.charAt(RANDOM.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }

    private User findTeacherInSchool(Long teacherId) {
        User teacher = userRepository.findById(teacherId)
                .filter(u -> u.getRole() == Role.TEACHER)
                .orElseThrow(() -> ApiException.notFound("Teacher not found"));
        if (!teacher.getSchool().getId().equals(CurrentUser.get().getSchoolId())) {
            throw ApiException.notFound("Teacher not found");
        }
        return teacher;
    }

    private List<TeacherDirectoryEntry> toDirectoryEntries(List<User> teachers) {
        return teachers.stream()
                .map(teacher -> {
                    TeacherProfile profile = teacherProfileRepository.findByUserId(teacher.getId()).orElse(null);
                    long subjectCount = subjectRepository.findByTeacherId(teacher.getId()).size();
                    return new TeacherDirectoryEntry(
                            teacher.getId(), teacher.getName(), teacher.getEmail(),
                            profile != null ? profile.getDesignation() : null,
                            profile != null && profile.getProfilePhotoRef() != null,
                            subjectCount
                    );
                }).toList();
    }

    private TeacherProfileResponse buildResponse(Long teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> ApiException.notFound("Teacher not found"));
        TeacherProfile profile = teacherProfileRepository.findByUserId(teacherId).orElse(null);
        List<SubjectResponse> subjects = subjectRepository.findByTeacherId(teacherId).stream().map(SubjectResponse::from).toList();
        return TeacherProfileResponse.from(teacher, profile, subjects);
    }

    private TeacherProfile getOrCreate(Long teacherId) {
        return teacherProfileRepository.findByUserId(teacherId).orElseGet(() -> {
            User teacher = userRepository.findById(teacherId).orElseThrow();
            return teacherProfileRepository.save(new TeacherProfile(teacher));
        });
    }

    private Long currentTeacherId() {
        AuthenticatedUser user = CurrentUser.get();
        if (user.getRole() != Role.TEACHER) {
            throw ApiException.forbidden("Only teachers have a teaching profile");
        }
        return user.getUserId();
    }

    private void assertSameSchool(Long teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> ApiException.notFound("Teacher not found"));
        Long schoolId = CurrentUser.get().getSchoolId();
        if (!teacher.getSchool().getId().equals(schoolId)) {
            throw ApiException.notFound("Teacher not found");
        }
    }
}
