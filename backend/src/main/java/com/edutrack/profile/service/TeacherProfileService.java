package com.edutrack.profile.service;

import com.edutrack.common.ApiException;
import com.edutrack.org.dto.SubjectResponse;
import com.edutrack.org.entity.Role;
import com.edutrack.org.entity.User;
import com.edutrack.org.repository.SubjectRepository;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.profile.dto.TeacherDirectoryEntry;
import com.edutrack.profile.dto.TeacherProfileResponse;
import com.edutrack.profile.dto.TeacherProfileUpdateRequest;
import com.edutrack.profile.dto.TimetableSlotResponse;
import com.edutrack.profile.entity.TeacherProfile;
import com.edutrack.profile.repository.TeacherProfileRepository;
import com.edutrack.profile.repository.TimetableSlotRepository;
import com.edutrack.security.AuthenticatedUser;
import com.edutrack.security.CurrentUser;
import com.edutrack.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TeacherProfileService {

    private static final List<String> ALLOWED_PHOTO_TYPES = List.of("image/jpeg", "image/png", "image/webp");

    private final TeacherProfileRepository teacherProfileRepository;
    private final TimetableSlotRepository timetableSlotRepository;
    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final FileStorageService fileStorageService;

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
        String ref = fileStorageService.store(file, "profile-photos");
        profile.setProfilePhotoRef(ref);
        profile.setUpdatedAt(Instant.now());
        teacherProfileRepository.save(profile);
        return buildResponse(teacherId);
    }

    @Transactional(readOnly = true)
    public byte[] getPhotoBytes(Long teacherId) {
        TeacherProfile profile = teacherProfileRepository.findByUserId(teacherId)
                .orElseThrow(() -> ApiException.notFound("No profile photo set"));
        if (profile.getProfilePhotoRef() == null) {
            throw ApiException.notFound("No profile photo set");
        }
        return fileStorageService.load(profile.getProfilePhotoRef());
    }

    @Transactional(readOnly = true)
    public String getPhotoContentType(Long teacherId) {
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
    public List<TeacherDirectoryEntry> listDirectory() {
        Long schoolId = CurrentUser.get().getSchoolId();
        return userRepository.findBySchoolIdAndRole(schoolId, Role.TEACHER).stream()
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

    @Transactional(readOnly = true)
    public List<TimetableSlotResponse> listMyTimetable() {
        return timetableSlotRepository.findByTeacherIdOrderByDayOfWeekAscStartTimeAsc(currentTeacherId())
                .stream().map(TimetableSlotResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<TimetableSlotResponse> listTimetableFor(Long teacherId) {
        assertSameSchool(teacherId);
        return timetableSlotRepository.findByTeacherIdOrderByDayOfWeekAscStartTimeAsc(teacherId)
                .stream().map(TimetableSlotResponse::from).toList();
    }

    @Transactional
    public TimetableSlotResponse addSlot(Long subjectId, java.time.DayOfWeek dayOfWeek, java.time.LocalTime start, java.time.LocalTime end) {
        if (!end.isAfter(start)) {
            throw ApiException.badRequest("End time must be after start time");
        }
        Long teacherId = currentTeacherId();
        User teacher = userRepository.findById(teacherId).orElseThrow();
        com.edutrack.org.entity.Subject subject = null;
        if (subjectId != null) {
            subject = subjectRepository.findById(subjectId)
                    .orElseThrow(() -> ApiException.notFound("Subject not found"));
            if (!subject.getTeacher().getId().equals(teacherId)) {
                throw ApiException.forbidden("You can only add timetable slots for subjects you teach");
            }
        }
        var slot = new com.edutrack.profile.entity.TimetableSlot(teacher, subject, dayOfWeek, start, end);
        return TimetableSlotResponse.from(timetableSlotRepository.save(slot));
    }

    @Transactional
    public void deleteSlot(Long slotId) {
        var slot = timetableSlotRepository.findById(slotId)
                .orElseThrow(() -> ApiException.notFound("Timetable slot not found"));
        if (!slot.getTeacher().getId().equals(currentTeacherId())) {
            throw ApiException.forbidden("You can only manage your own timetable");
        }
        timetableSlotRepository.delete(slot);
    }

    private TeacherProfileResponse buildResponse(Long teacherId) {
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> ApiException.notFound("Teacher not found"));
        TeacherProfile profile = teacherProfileRepository.findByUserId(teacherId).orElse(null);
        List<SubjectResponse> subjects = subjectRepository.findByTeacherId(teacherId).stream().map(SubjectResponse::from).toList();
        List<TimetableSlotResponse> timetable = timetableSlotRepository.findByTeacherIdOrderByDayOfWeekAscStartTimeAsc(teacherId)
                .stream().map(TimetableSlotResponse::from).toList();
        return TeacherProfileResponse.from(teacher, profile, subjects, timetable);
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
