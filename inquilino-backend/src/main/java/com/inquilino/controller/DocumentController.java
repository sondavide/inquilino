package com.inquilino.controller;

import com.inquilino.dto.document.DocumentUploadResponse;
import com.inquilino.entity.Document;
import com.inquilino.enums.DocumentType;
import com.inquilino.security.UserPrincipal;
import com.inquilino.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/onboarding/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DocumentUploadResponse upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") DocumentType type,
            @AuthenticationPrincipal UserPrincipal principal) {

        return documentService.uploadAndVerify(principal.getUserId(), file, type);
    }

    @GetMapping
    public List<Document> list(@AuthenticationPrincipal UserPrincipal principal) {
        return documentService.findByUserId(principal.getUserId());
    }
}
