package com.edutrack.security;

import com.edutrack.common.ApiResponse;
import com.edutrack.org.repository.UserRepository;
import com.edutrack.security.dto.LoginRequest;
import com.edutrack.security.dto.LoginResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final LoginAttemptService loginAttemptService;

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String ip = clientIp(httpRequest);
        loginAttemptService.assertNotLocked(request.email(), ip);

        AuthenticatedUser user;
        try {
            var authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password()));
            user = (AuthenticatedUser) authentication.getPrincipal();
        } catch (AuthenticationException ex) {
            loginAttemptService.recordFailure(request.email(), ip);
            throw ex;
        }
        loginAttemptService.recordSuccess(request.email(), ip);

        String token = jwtService.generateToken(user);
        boolean mustChangePassword = userRepository.findById(user.getUserId())
                .map(u -> u.getTempPassword() != null)
                .orElse(false);
        var summary = new LoginResponse.UserSummary(
                user.getUserId(), user.getName(), user.getUsername(), user.getRole().name(), user.getSchoolId(), mustChangePassword);
        return ApiResponse.ok(new LoginResponse(token, summary));
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
