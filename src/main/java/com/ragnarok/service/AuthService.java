package com.ragnarok.service;

import com.ragnarok.dto.AuthRequest;
import com.ragnarok.dto.AuthResponse;
import com.ragnarok.dto.RegisterRequest;
import com.ragnarok.entity.Role;
import com.ragnarok.entity.UserAccount;
import com.ragnarok.repository.UserAccountRepository;
import com.ragnarok.security.JwtTokenService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserAccountRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final AuthenticationManager authenticationManager;
    private final long expirationMs;

    public AuthService(
            UserAccountRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            AuthenticationManager authenticationManager,
            @Value("${ragnarok.jwt.expiration-ms:86400000}") long expirationMs) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.authenticationManager = authenticationManager;
        this.expirationMs = expirationMs;
    }

    @PostConstruct
    public void seedDefaultUsers() {
        try {
            if (userRepository.count() == 0) {
                log.info("[AuthService] Seeding default Admin and User accounts...");
                
                UserAccount admin = new UserAccount(
                        null,
                        "admin@ragnarok.ai",
                        passwordEncoder.encode("Admin@123"),
                        "Ragnarok Master Admin",
                        Role.ROLE_ADMIN,
                        LocalDateTime.now(),
                        LocalDateTime.now()
                );
                userRepository.save(admin);

                UserAccount user = new UserAccount(
                        null,
                        "user@ragnarok.ai",
                        passwordEncoder.encode("User@123"),
                        "Standard Agent User",
                        Role.ROLE_USER,
                        LocalDateTime.now(),
                        LocalDateTime.now()
                );
                userRepository.save(user);

                log.info("[AuthService] Default accounts created: admin@ragnarok.ai (ROLE_ADMIN) and user@ragnarok.ai (ROLE_USER)");
            }
        } catch (Exception e) {
            log.warn("[AuthService] Seed users notice: {}", e.getMessage());
        }
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email is required.");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters.");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("User with email '" + normalizedEmail + "' already exists.");
        }

        Role role = Role.ROLE_USER;
        if (request.getRole() != null && !request.getRole().isBlank()) {
            try {
                role = Role.valueOf(request.getRole().trim().toUpperCase());
            } catch (Exception e) {
                role = Role.ROLE_USER;
            }
        }

        UserAccount user = new UserAccount(
                null,
                normalizedEmail,
                passwordEncoder.encode(request.getPassword()),
                request.getFullName() != null && !request.getFullName().isBlank() ? request.getFullName().trim() : "Agent User",
                role,
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        UserAccount saved = userRepository.save(user);
        String token = jwtTokenService.generateToken(saved.getEmail(), saved.getRole().name(), saved.getFullName(), saved.getId());

        return new AuthResponse(
                token,
                saved.getId(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole().name(),
                expirationMs
        );
    }

    public AuthResponse login(AuthRequest request) {
        if (request.getEmail() == null || request.getPassword() == null) {
            throw new IllegalArgumentException("Email and password are required.");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(normalizedEmail, request.getPassword())
            );

            UserAccount user = userRepository.findByEmail(normalizedEmail)
                    .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

            String token = jwtTokenService.generateToken(user.getEmail(), user.getRole().name(), user.getFullName(), user.getId());

            return new AuthResponse(
                    token,
                    user.getId(),
                    user.getEmail(),
                    user.getFullName(),
                    user.getRole().name(),
                    expirationMs
            );
        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid email or password.");
        }
    }

    public UserAccount getCurrentUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }
}
