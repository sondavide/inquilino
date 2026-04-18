package com.inquilino.service;

import com.inquilino.dto.agency.*;
import com.inquilino.entity.AgencyAreaEntity;
import com.inquilino.entity.AgencyMembership;
import com.inquilino.entity.AgencyProfile;
import com.inquilino.entity.User;
import com.inquilino.enums.AgencyStatus;
import com.inquilino.enums.UserType;
import com.inquilino.repository.AgencyAreaRepository;
import com.inquilino.repository.AgencyMembershipRepository;
import com.inquilino.repository.AgencyProfileRepository;
import com.inquilino.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AgencyService {

    private final AgencyProfileRepository agencyProfileRepo;
    private final AgencyAreaRepository agencyAreaRepo;
    private final AgencyMembershipRepository membershipRepo;
    private final UserRepository userRepository;

    private static final GeometryFactory GEO = new GeometryFactory(new PrecisionModel(), 4326);
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final PasswordResetService passwordResetService;
    private final PasswordEncoder passwordEncoder;

    // ─── Lettura profilo ──────────────────────────────────────────────────────

    public AgencyProfile getByUserId(UUID userId) {
        return agencyProfileRepo.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agency profile not found"));
    }

    public AgencyProfile getById(UUID agencyId) {
        return agencyProfileRepo.findById(agencyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agency not found"));
    }

    /** Usato dagli operatori: risale all'agenzia dalla membership. */
    public AgencyProfile getByOperatorUserId(UUID operatorUserId) {
        AgencyMembership membership = membershipRepo.findByOperatorUserId(operatorUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Operator membership not found"));
        return getByUserId(membership.getAgencyUserId());
    }

    /**
     * Risolve il profilo agenzia dal userId corrente:
     * - se AGENCY → cerca direttamente
     * - se AGENCY_OPERATOR → risale tramite membership
     */
    public AgencyProfile resolveAgencyProfile(UUID userId, UserType userType) {
        if (userType == UserType.AGENCY) return getByUserId(userId);
        if (userType == UserType.AGENCY_OPERATOR) return getByOperatorUserId(userId);
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not an agency user");
    }

    // ─── Aggiornamento profilo ─────────────────────────────────────────────────

    @Transactional
    public AgencyProfile updateProfile(UUID agencyUserId, UpdateAgencyProfileRequest req) {
        AgencyProfile profile = getByUserId(agencyUserId);
        if (req.agencyName()    != null) profile.setAgencyName(req.agencyName());
        if (req.vatNumber()     != null) profile.setVatNumber(req.vatNumber());
        if (req.reaNumber()     != null) profile.setReaNumber(req.reaNumber());
        if (req.websiteUrl()    != null) profile.setWebsiteUrl(req.websiteUrl());
        if (req.contactEmail()  != null) profile.setContactEmail(req.contactEmail());
        if (req.contactPhone()  != null) profile.setContactPhone(req.contactPhone());
        return agencyProfileRepo.save(profile);
    }

    @Transactional
    public AgencyProfile updateAreas(UUID agencyUserId, List<Map<String, Object>> areas) {
        AgencyProfile profile = getByUserId(agencyUserId);
        profile.setAreas(areas);
        agencyProfileRepo.save(profile);

        // Sync PostGIS geometry table for intersection queries
        agencyAreaRepo.deleteByAgencyUserId(agencyUserId);
        for (Map<String, Object> area : areas) {
            AgencyAreaEntity entity = buildAreaEntity(agencyUserId, area);
            if (entity != null) agencyAreaRepo.save(entity);
        }
        return profile;
    }

    @SuppressWarnings("unchecked")
    private AgencyAreaEntity buildAreaEntity(UUID agencyUserId, Map<String, Object> area) {
        try {
            String areaType    = (String) area.get("type");
            String name        = (String) area.getOrDefault("name", "");
            String displayName = (String) area.getOrDefault("displayName", name);
            String osmId       = area.get("osmId") != null ? area.get("osmId").toString() : null;

            List<Number> bbox = (List<Number>) area.get("boundingBox");
            org.locationtech.jts.geom.Geometry geom = null;
            if (bbox != null && bbox.size() == 4) {
                // Nominatim bbox: [south, north, west, east]
                double south = bbox.get(0).doubleValue();
                double north = bbox.get(1).doubleValue();
                double west  = bbox.get(2).doubleValue();
                double east  = bbox.get(3).doubleValue();
                geom = GEO.createPolygon(new Coordinate[]{
                    new Coordinate(west, south),
                    new Coordinate(east, south),
                    new Coordinate(east, north),
                    new Coordinate(west, north),
                    new Coordinate(west, south)
                });
            }

            return AgencyAreaEntity.builder()
                    .agencyUserId(agencyUserId)
                    .areaType(areaType)
                    .osmId(osmId)
                    .name(name)
                    .displayName(displayName)
                    .areaGeometry(geom)
                    .build();
        } catch (Exception e) {
            return null; // area malformata — skip silenzioso
        }
    }

    // ─── Admin: approvazione / rifiuto / sospensione ──────────────────────────

    public Page<AgencyProfile> listByStatus(AgencyStatus status, Pageable pageable) {
        return agencyProfileRepo.findByStatus(status, pageable);
    }

    public Page<AgencyProfile> listAll(Pageable pageable) {
        return agencyProfileRepo.findAll(pageable);
    }

    @Transactional
    public AgencyProfile approve(UUID agencyId, UUID adminId) {
        AgencyProfile profile = getById(agencyId);
        if (profile.getStatus() == AgencyStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Agency already active");
        }
        profile.setStatus(AgencyStatus.ACTIVE);
        profile.setApprovedAt(LocalDateTime.now());
        profile.setApprovedByAdminId(adminId);
        profile.setStatusNote(null);
        agencyProfileRepo.save(profile);

        notificationService.notifyAgencyApproved(profile.getUserId());
        return profile;
    }

    @Transactional
    public AgencyProfile reject(UUID agencyId, String note, UUID adminId) {
        AgencyProfile profile = getById(agencyId);
        profile.setStatus(AgencyStatus.PENDING_APPROVAL);
        profile.setStatusNote(note);
        agencyProfileRepo.save(profile);

        notificationService.notifyAgencyRejected(profile.getUserId(), note);
        return profile;
    }

    @Transactional
    public AgencyProfile suspend(UUID agencyId, String note, UUID adminId) {
        AgencyProfile profile = getById(agencyId);
        profile.setStatus(AgencyStatus.SUSPENDED);
        profile.setStatusNote(note);
        agencyProfileRepo.save(profile);

        notificationService.notifyAgencySuspended(profile.getUserId(), note);
        return profile;
    }

    // ─── Gestione operatori ───────────────────────────────────────────────────

    public List<AgencyMembership> listOperators(UUID agencyUserId) {
        return membershipRepo.findByAgencyUserId(agencyUserId);
    }

    @Transactional
    public AgencyMembership inviteOperator(UUID agencyUserId, InviteOperatorRequest req) {
        AgencyProfile agency = getByUserId(agencyUserId);
        if (agency.getStatus() != AgencyStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Agency must be active to invite operators");
        }

        String email = req.email().trim().toLowerCase();

        User operator = userRepository.findByEmail(email).orElse(null);
        if (operator == null) {
            // Crea nuovo utente operatore senza password — dovrà impostarla via invito
            operator = User.builder()
                    .type(UserType.AGENCY_OPERATOR)
                    .email(email)
                    .verified(true)
                    .build();
            operator = userRepository.save(operator);
            passwordResetService.sendOperatorInvite(operator, agency.getAgencyName());
        } else {
            // L'email esiste già: deve essere un AGENCY_OPERATOR non ancora in un'altra agenzia
            if (operator.getType() != UserType.AGENCY_OPERATOR) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This email is already registered with a different role");
            }
            if (membershipRepo.findByOperatorUserId(operator.getId()).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This operator already belongs to an agency");
            }
        }

        if (membershipRepo.existsByAgencyUserIdAndOperatorUserId(agencyUserId, operator.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Operator already in this agency");
        }

        AgencyMembership membership = AgencyMembership.builder()
                .agencyUserId(agencyUserId)
                .operatorUserId(operator.getId())
                .listingScope(req.listingScope())
                .addedByUserId(agencyUserId)
                .build();
        return membershipRepo.save(membership);
    }

    @Transactional
    public AgencyMembership updateOperatorScope(UUID agencyUserId, UUID operatorUserId, List<UUID> scope) {
        AgencyMembership membership = membershipRepo
                .findByAgencyUserIdAndOperatorUserId(agencyUserId, operatorUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Operator not found in agency"));
        membership.setListingScope(scope);
        return membershipRepo.save(membership);
    }

    @Transactional
    public void removeOperator(UUID agencyUserId, UUID operatorUserId) {
        if (!membershipRepo.existsByAgencyUserIdAndOperatorUserId(agencyUserId, operatorUserId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Operator not found in agency");
        }
        membershipRepo.deleteByAgencyUserIdAndOperatorUserId(agencyUserId, operatorUserId);
    }

    // ─── Utility per controller ───────────────────────────────────────────────

    /**
     * Ritorna l'ID utente effettivo del publisher per le operazioni sugli annunci.
     * Per AGENCY_OPERATOR restituisce l'agencyUserId tramite membership.
     */
    public UUID resolvePublisherUserId(UUID userId, UserType userType) {
        if (userType == UserType.AGENCY_OPERATOR) {
            return membershipRepo.findByOperatorUserId(userId)
                    .map(AgencyMembership::getAgencyUserId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Operator has no agency"));
        }
        return userId;
    }

    /**
     * Verifica che un operatore abbia accesso a un listing specifico (scope check).
     * Per AGENCY/LANDLORD non fa nulla (controllo già nella service/repo).
     */
    public void assertListingScope(UUID listingId, UUID operatorUserId) {
        AgencyMembership membership = membershipRepo.findByOperatorUserId(operatorUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Operator has no agency"));
        if (membership.getListingScope() != null && !membership.getListingScope().contains(listingId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Listing not in operator scope");
        }
    }

    // ─── Mapper ───────────────────────────────────────────────────────────────

    public AgencyProfileResponse toResponse(AgencyProfile p) {
        return new AgencyProfileResponse(
                p.getId(), p.getUserId(), p.getAgencyName(), p.getVatNumber(),
                p.getReaNumber(), p.getWebsiteUrl(), p.getContactEmail(), p.getContactPhone(),
                p.getStatus(), p.getStatusNote(), p.getAreas(), p.getCreatedAt(), p.getApprovedAt());
    }

    public AgencyProfileSummaryDto toSummary(AgencyProfile p) {
        return new AgencyProfileSummaryDto(
                p.getId(), p.getUserId(), p.getAgencyName(), p.getVatNumber(),
                p.getContactEmail(), p.getStatus(), p.getStatusNote(),
                p.getCreatedAt(), p.getApprovedAt());
    }

    public AgencyMembershipDto toMembershipDto(AgencyMembership m) {
        User op = userRepository.findById(m.getOperatorUserId()).orElse(null);
        String email = op != null ? op.getEmail() : "";
        String name = ""; // in futuro da AgencyOperatorProfile
        return new AgencyMembershipDto(
                m.getId(), m.getOperatorUserId(), email, name,
                m.getListingScope(), m.getAddedAt());
    }
}
