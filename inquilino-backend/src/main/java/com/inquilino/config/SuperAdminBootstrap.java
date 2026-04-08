package com.inquilino.config;

import com.inquilino.entity.User;
import com.inquilino.enums.UserType;
import com.inquilino.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Al bootstrap dell'applicazione crea il SUPERADMIN se non esiste.
 * Credenziali configurabili via application.yml / variabili d'ambiente.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SuperAdminBootstrap implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.superadmin.email:admin@inquilino.it}")
    private String adminEmail;

    @Value("${app.superadmin.password:ChangeMe123!}")
    private String adminPassword;

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByEmail(adminEmail)) {
            log.debug("SUPERADMIN already exists: {}", adminEmail);
            return;
        }
        User admin = User.builder()
                .type(UserType.SUPERADMIN)
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .verified(true)
                .build();
        userRepository.save(admin);
        log.info("SUPERADMIN created: {}", adminEmail);
    }
}
