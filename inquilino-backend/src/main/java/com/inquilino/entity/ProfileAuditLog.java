package com.inquilino.entity;

import com.inquilino.enums.AuditAction;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Log immutabile di tutte le azioni sul profilo tenant.
 * Accessibile solo al SUPERADMIN.
 */
@Entity
@Table(name = "profile_audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProfileAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_profile_id", nullable = true)
    private UUID tenantProfileId;

    /** UUID dell'utente che ha compiuto l'azione (supervisor, superadmin o tenant) */
    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    /** Ruolo dell'attore al momento dell'azione (es. "SUPERVISOR") */
    @Column(name = "actor_type", nullable = false, length = 20)
    private String actorType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AuditAction action;

    /** Campo interessato (null per azioni di stato) */
    @Column(name = "field_name", length = 100)
    private String fieldName;

    /** Valore precedente (serializzato come stringa) */
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    /** Nuovo valore (serializzato come stringa) */
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    /** Nota aggiuntiva (es. la nota del supervisore su un campo flaggato) */
    @Column(columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
