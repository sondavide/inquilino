package com.inquilino.repository;

import com.inquilino.entity.ScoringTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScoringTemplateRepository extends JpaRepository<ScoringTemplate, UUID> {

    Optional<ScoringTemplate> findByIsDefaultTrue();
}
