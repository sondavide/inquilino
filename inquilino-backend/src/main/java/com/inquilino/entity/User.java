package com.inquilino.entity;

import com.inquilino.enums.UserType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;


@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserType type;

    @Column(nullable = false, unique = true)
    private String email;

    private String phone;

    private String passwordHash;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private boolean verified = false;

    // OAuth2 social identity
    private String provider;
    private String providerUserId;
    private String profileUrl;

    // Spam protection
    @Column(nullable = false)
    private int spamStrikes = 0;

    /** Non-null while the user is banned. Year 9999 = permanent ban. */
    private LocalDateTime chatBannedUntil;
}
