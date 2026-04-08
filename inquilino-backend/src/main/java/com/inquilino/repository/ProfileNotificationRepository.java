package com.inquilino.repository;

import com.inquilino.entity.ProfileNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProfileNotificationRepository extends JpaRepository<ProfileNotification, UUID> {

    List<ProfileNotification> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserIdAndReadFalse(UUID userId);
}
