package com.edutrack.security;

import com.edutrack.org.entity.User;
import com.edutrack.org.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsernameNotFoundException("No account found for " + email));
        return toAuthenticatedUser(user);
    }

    public static AuthenticatedUser toAuthenticatedUser(User user) {
        return new AuthenticatedUser(
                user.getId(),
                user.getSchool().getId(),
                user.getEmail(),
                user.getPasswordHash(),
                user.getRole(),
                user.getName(),
                user.isActive()
        );
    }
}
