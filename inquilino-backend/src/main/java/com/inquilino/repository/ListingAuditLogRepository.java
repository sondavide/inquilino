package com.inquilino.repository;

import com.inquilino.entity.ListingAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ListingAuditLogRepository extends JpaRepository<ListingAuditLog, UUID> {
    List<ListingAuditLog> findByListingIdOrderByCreatedAtDesc(UUID listingId);
}
