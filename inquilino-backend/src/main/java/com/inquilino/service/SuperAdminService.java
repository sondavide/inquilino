package com.inquilino.service;

import com.inquilino.entity.ProfileAuditLog;
import com.inquilino.entity.User;
import com.inquilino.enums.AuditAction;
import com.inquilino.enums.UserType;
import com.inquilino.repository.ProfileAuditLogRepository;
import com.inquilino.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private final UserRepository userRepository;
    private final ProfileAuditLogRepository auditLogRepo;
    private final PasswordEncoder passwordEncoder;

    public User createSupervisor(String email, String password, String phone,
                                  UUID createdBy) {
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email già registrata");
        }
        User supervisor = User.builder()
                .type(UserType.SUPERVISOR)
                .email(email)
                .phone(phone)
                .passwordHash(passwordEncoder.encode(password))
                .verified(true)
                .build();
        supervisor = userRepository.save(supervisor);

        auditLogRepo.save(ProfileAuditLog.builder()
                .actorId(createdBy)
                .actorType("SUPERADMIN")
                .action(AuditAction.SUPERVISOR_CREATED)
                .newValue(email)
                .build());

        return supervisor;
    }

    public List<User> listSupervisors() {
        return userRepository.findByType(UserType.SUPERVISOR);
    }

    public Page<ProfileAuditLog> getAuditLog(UUID profileId, String q, Pageable pageable) {
        if (q != null && !q.isBlank()) {
            return auditLogRepo.search(profileId, "%" + q.toLowerCase() + "%", pageable);
        }
        if (profileId != null) {
            return auditLogRepo.findByTenantProfileIdOrderByCreatedAtDesc(profileId, pageable);
        }
        return auditLogRepo.findAllByOrderByCreatedAtDesc(pageable);
    }
}
