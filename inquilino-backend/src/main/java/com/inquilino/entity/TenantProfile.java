package com.inquilino.entity;

import com.inquilino.enums.ContractType;
import com.inquilino.enums.EmploymentType;
import com.inquilino.enums.VerificationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "tenant_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String fullName;
    private LocalDate birthDate;
    private String birthPlace;
    private String residence;
    private String fiscalCode;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private EmploymentType employmentType;

    private BigDecimal monthlyIncome;

    @Enumerated(EnumType.STRING)
    @Column(name = "contract_type", length = 30)
    private ContractType contractType;

    private LocalDate employmentStartDate;

    /** Data di scadenza del contratto. Valorizzata solo per contractType = FIXED_TERM. */
    @Column(name = "employment_end_date")
    private LocalDate employmentEndDate;

    @Builder.Default
    private boolean hasGuarantor = false;
    private BigDecimal guarantorIncome;

    private BigDecimal maxBudget;
    private LocalDate moveInDate;
    private Integer occupants;
    @Builder.Default
    private boolean hasPets = false;
    @Builder.Default
    private boolean smoker = false;

    // Array of {city, area, coordinates} stored as JSONB
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<Map<String, Object>> desiredLocations;

    @Builder.Default
    @Column(nullable = false)
    private int profileCompletion = 0;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.NONE;

    /** When false the tenant has deactivated their profile and is no longer visible to landlords. */
    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    /** Supervisore che ha preso in carico la validazione (status = IN_VALIDATION) */
    @Column(name = "assigned_supervisor_id")
    private UUID assignedSupervisorId;

    /** Supervisore che ha effettuato l'ultima validazione (notificato quando l'utente corregge) */
    @Column(name = "last_validated_by_supervisor_id")
    private UUID lastValidatedBySupervisorId;

    /**
     * Template di scoring assegnato al profilo dal supervisore.
     * Se null vengono usati i pesi di default (20/20/20/20/20).
     * Live-link: quando il template viene aggiornato, i match vengono ricalcolati in background.
     */
    @Column(name = "scoring_template_id")
    private UUID scoringTemplateId;
}
