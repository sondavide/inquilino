package com.inquilino.repository;

import com.inquilino.entity.Document;
import com.inquilino.enums.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByUserId(UUID userId);

    List<Document> findByUserIdAndType(UUID userId, DocumentType type);
}
