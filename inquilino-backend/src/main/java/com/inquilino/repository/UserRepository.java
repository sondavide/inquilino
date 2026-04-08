package com.inquilino.repository;

import com.inquilino.entity.User;
import com.inquilino.enums.UserType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByProviderAndProviderUserId(String provider, String providerUserId);

    boolean existsByEmail(String email);

    List<User> findByType(UserType type);
}
