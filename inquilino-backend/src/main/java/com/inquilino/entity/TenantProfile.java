package com.inquilino.entity;

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
    private String contractType;
    private LocalDate employmentStartDate;

    private boolean hasGuarantor = false;
    private BigDecimal guarantorIncome;

    private BigDecimal maxBudget;
    private LocalDate moveInDate;
    private Integer occupants;
    private boolean hasPets = false;
    private boolean smoker = false;

    // Array of {city, area, coordinates} stored as JSONB
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<Map<String, Object>> desiredLocations;

    @Column(nullable = false)
    private int profileCompletion = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationStatus verificationStatus = VerificationStatus.NONE;
}
