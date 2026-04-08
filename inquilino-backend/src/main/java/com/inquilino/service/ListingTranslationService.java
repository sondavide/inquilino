package com.inquilino.service;

import com.inquilino.entity.Listing;
import com.inquilino.repository.ListingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ListingTranslationService {

    private final ChatClient        chatClient;
    private final ListingRepository listingRepo;

    /**
     * Translates title + description of the listing into the target language and saves the result.
     * Runs asynchronously so it does not block submitForReview.
     *
     * @param listingId  id of the listing to translate
     * @param sourceLang language the landlord used (e.g. "it")
     * @param targetLang language to translate into (e.g. "en")
     */
    @Async
    @Transactional
    public void translateAsync(java.util.UUID listingId, String sourceLang, String targetLang) {
        try {
            Listing listing = listingRepo.findById(listingId).orElse(null);
            if (listing == null) return;

            String title       = listing.getTitle();
            String description = listing.getDescription();

            if (title == null && description == null) return;

            String targetLangName = "en".equals(targetLang) ? "English" : "Italian";
            String sourceLangName = "it".equals(sourceLang) ? "Italian" : "English";

            StringBuilder prompt = new StringBuilder();
            prompt.append("You are a professional real-estate translator. ")
                  .append("Translate the following rental listing content from ").append(sourceLangName)
                  .append(" to ").append(targetLangName).append(".\n")
                  .append("Keep the tone neutral and professional. Preserve line breaks.\n")
                  .append("Reply ONLY with the JSON object, no markdown fences.\n\n")
                  .append("Input JSON:\n")
                  .append("{\"title\":").append(jsonStr(title)).append(",")
                  .append("\"description\":").append(jsonStr(description)).append("}\n\n")
                  .append("Output JSON (same structure, translated values):");

            String response = chatClient.prompt()
                    .user(prompt.toString())
                    .call()
                    .content();

            if (response == null || response.isBlank()) return;

            // Parse minimal JSON without pulling in Jackson (it's already on classpath)
            com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode node = om.readTree(response.trim());

            String translatedTitle       = node.path("title").asText(null);
            String translatedDescription = node.path("description").asText(null);

            if ("en".equals(targetLang)) {
                if (translatedTitle != null)       listing.setTitleEn(translatedTitle);
                if (translatedDescription != null) listing.setDescriptionEn(translatedDescription);
            } else {
                // if target is 'it', store back into title/description
                if (translatedTitle != null)       listing.setTitle(translatedTitle);
                if (translatedDescription != null) listing.setDescription(translatedDescription);
            }

            listing.setSourceLang(sourceLang);
            listingRepo.save(listing);
            log.info("Translated listing {} ({} → {})", listingId, sourceLang, targetLang);

        } catch (Exception e) {
            log.warn("Translation failed for listing {}: {}", listingId, e.getMessage());
        }
    }

    private static String jsonStr(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
                       .replace("\n", "\\n").replace("\r", "") + "\"";
    }
}
