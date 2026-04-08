package com.inquilino.service;

import com.inquilino.entity.Listing;
import com.inquilino.entity.ListingMedia;
import com.inquilino.enums.ListingStatus;
import com.inquilino.repository.ListingMediaRepository;
import com.inquilino.repository.ListingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ListingMediaService {

    private final ListingRepository  listingRepo;
    private final ListingMediaRepository mediaRepo;
    private final S3Client           s3Client;

    @Value("${minio.listings-bucket}")
    private String bucket;

    @Value("${minio.endpoint}")
    private String minioEndpoint;

    // ─── Upload media ─────────────────────────────────────────────────────────

    @Transactional
    public ListingMedia upload(UUID listingId, UUID publisherUserId,
                               MultipartFile file, String mediaType) {
        Listing listing = listingRepo.findByIdAndPublisherUserId(listingId, publisherUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));

        if (listing.getStatus() == ListingStatus.PUBLISHED
                || listing.getStatus() == ListingStatus.ARCHIVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Cannot upload media to a published/archived listing");
        }

        String ext     = getExtension(file.getOriginalFilename());
        String key     = "listings/" + listingId + "/" + UUID.randomUUID() + ext;
        String fileUrl = minioEndpoint + "/" + bucket + "/" + key;

        try {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucket).key(key)
                            .contentType(file.getContentType())
                            .build(),
                    RequestBody.fromBytes(file.getBytes()));
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Upload failed");
        }

        // Calcola sort_order come next available tra elementi dello stesso tipo
        List<ListingMedia> existing = mediaRepo.findByListingIdOrderBySortOrderAsc(listingId);
        List<ListingMedia> sameType = existing.stream()
                .filter(m -> m.getMediaType().equals(mediaType != null ? mediaType : "IMAGE"))
                .toList();
        int nextOrder = sameType.isEmpty() ? 0 : sameType.get(sameType.size() - 1).getSortOrder() + 1;
        // Solo le immagini possono essere copertina
        boolean isCover = "IMAGE".equals(mediaType)
                && existing.stream().noneMatch(m -> "IMAGE".equals(m.getMediaType()));

        ListingMedia media = ListingMedia.builder()
                .listingId(listingId)
                .mediaType(mediaType != null ? mediaType : "IMAGE")
                .fileUrl(fileUrl)
                .sortOrder(nextOrder)
                .isCover(isCover)
                .build();

        return mediaRepo.save(media);
    }

    // ─── Elimina media ────────────────────────────────────────────────────────

    @Transactional
    public void delete(UUID listingId, UUID mediaId, UUID publisherUserId) {
        listingRepo.findByIdAndPublisherUserId(listingId, publisherUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));

        ListingMedia media = mediaRepo.findByIdAndListingId(mediaId, listingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Media not found"));

        deleteFromStorage(media.getFileUrl());
        boolean wasCover = media.isCover();
        mediaRepo.delete(media);

        // Se era la copertina, promuovi la prossima foto
        if (wasCover) {
            mediaRepo.findByListingIdOrderBySortOrderAsc(listingId).stream()
                    .findFirst()
                    .ifPresent(m -> { m.setCover(true); mediaRepo.save(m); });
        }
    }

    // ─── Imposta copertina ────────────────────────────────────────────────────

    @Transactional
    public void setCover(UUID listingId, UUID mediaId, UUID publisherUserId) {
        listingRepo.findByIdAndPublisherUserId(listingId, publisherUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));

        List<ListingMedia> all = mediaRepo.findByListingIdOrderBySortOrderAsc(listingId);
        all.forEach(m -> {
            boolean shouldBeCover = m.getId().equals(mediaId);
            if (m.isCover() != shouldBeCover) {
                m.setCover(shouldBeCover);
                mediaRepo.save(m);
            }
        });
    }

    // ─── Riordina media ───────────────────────────────────────────────────────

    @Transactional
    public void reorder(UUID listingId, List<UUID> orderedIds, UUID publisherUserId) {
        listingRepo.findByIdAndPublisherUserId(listingId, publisherUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Listing not found"));

        List<ListingMedia> all = mediaRepo.findByListingIdOrderBySortOrderAsc(listingId);
        for (int i = 0; i < orderedIds.size(); i++) {
            final int order = i;
            UUID id = orderedIds.get(i);
            all.stream().filter(m -> m.getId().equals(id)).findFirst()
                    .ifPresent(m -> { m.setSortOrder(order); mediaRepo.save(m); });
        }
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private void deleteFromStorage(String fileUrl) {
        try {
            String prefix = "/" + bucket + "/";
            int idx = fileUrl.indexOf(prefix);
            String key = idx >= 0 ? fileUrl.substring(idx + prefix.length()) : fileUrl;
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
        } catch (Exception ignored) {}
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf("."));
    }
}
