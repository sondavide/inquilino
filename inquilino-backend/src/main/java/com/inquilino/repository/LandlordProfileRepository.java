package com.inquilino.repository;

import com.inquilino.entity.LandlordProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LandlordProfileRepository extends JpaRepository<LandlordProfile, UUID> {
    Optional<LandlordProfile> findByUserId(UUID userId);
    boolean existsByUserId(UUID userId);

    @Query("SELECT p FROM LandlordProfile p LEFT JOIN FETCH p.user WHERE p.userId = :userId")
    Optional<LandlordProfile> findByUserIdWithUser(@Param("userId") UUID userId);
}
