package com.inquilino.repository;

import com.inquilino.entity.Listing;
import com.inquilino.enums.ListingStatus;
import com.inquilino.enums.PublisherType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ListingRepository extends JpaRepository<Listing, UUID> {

    List<Listing> findByPublisherUserId(UUID publisherUserId);

    List<Listing> findByPublisherUserIdAndStatusNot(UUID publisherUserId, ListingStatus status);

    List<Listing> findByStatusIn(List<ListingStatus> statuses);

    Page<Listing> findByStatusIn(List<ListingStatus> statuses, Pageable pageable);

    Page<Listing> findByStatusInAndPublisherType(List<ListingStatus> statuses, PublisherType publisherType, Pageable pageable);

    Optional<Listing> findByIdAndPublisherUserId(UUID id, UUID publisherUserId);

    boolean existsBySlug(String slug);

    /** Annunci di un publisher filtrati per lista di ID (per scope operatore). */
    @org.springframework.data.jpa.repository.Query(
        "SELECT l FROM Listing l WHERE l.publisherUserId = :publisherUserId AND l.id IN :ids")
    List<Listing> findByPublisherUserIdAndIdIn(
        @org.springframework.data.repository.query.Param("publisherUserId") UUID publisherUserId,
        @org.springframework.data.repository.query.Param("ids") List<UUID> ids);
}
