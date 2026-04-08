package com.inquilino.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

/**
 * Genera una descrizione testuale AI della compatibilità tra un annuncio e un profilo tenant.
 * Usata da MatchingService per popolare Match.matchSummary.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MatchSummaryService {

    private final ChatClient chatClient;

    /**
     * Genera una descrizione di 2-3 frasi in italiano che spiega la compatibilità
     * tra il profilo tenant e l'annuncio, con un consiglio finale per il locatore.
     *
     * @param matchBand        EXCELLENT_MATCH | GOOD_MATCH | MEDIUM_MATCH | WEAK_MATCH
     * @param geoScore         punteggio geografico 0-100
     * @param priceScore       punteggio prezzo 0-100
     * @param timingScore      punteggio timing 0-100
     * @param fitScore         punteggio fit lifestyle 0-100
     * @param tenantStrength   solidità profilo 0-100
     * @param priceBand        within_budget | within_tolerance | over_budget | unknown
     * @param occupationLabel  categoria occupazione (es. "dipendente", "autonomo")
     * @param municipality     città dell'annuncio
     */
    public String generate(
            String matchBand,
            double geoScore,
            double priceScore,
            double timingScore,
            double fitScore,
            double tenantStrength,
            String priceBand,
            String occupationLabel,
            String municipality) {
        try {
            String prompt = buildPrompt(matchBand, geoScore, priceScore, timingScore,
                    fitScore, tenantStrength, priceBand, occupationLabel, municipality);

            return chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();
        } catch (Exception e) {
            log.warn("MatchSummaryService: generazione fallita, uso fallback. Causa: {}", e.getMessage());
            return generateFallback(matchBand, priceBand, tenantStrength);
        }
    }

    private String buildPrompt(String band, double geo, double price, double timing,
                                double fit, double strength, String priceBand,
                                String occupation, String municipality) {
        return """
                Sei un assistente immobiliare professionale. Descrivi in 2-3 frasi concise (tono neutro, \
                italiano) la compatibilità tra questo inquilino e l'annuncio. \
                Concludi con un breve consiglio per il locatore (es. "Si consiglia di procedere." o \
                "Attendere candidati più adatti."). Non usare elenchi puntati.

                Dati match:
                - Compatibilità globale: %s
                - Zona: %d/100 %s
                - Prezzo: %d/100 (%s)
                - Timing disponibilità: %d/100
                - Stile di vita: %d/100
                - Solidità profilo inquilino: %d/100
                - Occupazione: %s
                - Città annuncio: %s
                """.formatted(
                bandLabel(band),
                Math.round(geo),   geo >= 80 ? "(ottima)" : geo >= 50 ? "(buona)" : "(discreta)",
                Math.round(price), priceBandLabel(priceBand),
                Math.round(timing),
                Math.round(fit),
                Math.round(strength),
                occupation != null ? occupation : "non specificata",
                municipality != null ? municipality : "non specificata"
        );
    }

    private String generateFallback(String band, String priceBand, double strength) {
        return switch (band != null ? band : "") {
            case "EXCELLENT_MATCH" -> "Profilo eccellente con alta compatibilità su tutti i criteri. " +
                    "Il prezzo rientra nel budget e la zona è allineata. " +
                    "Si consiglia di procedere con l'invito al contatto.";
            case "GOOD_MATCH" -> "Buon profilo con compatibilità solida su zona e prezzo. " +
                    "Qualche piccola discrepanza nei dettagli secondari. " +
                    "Vale la pena approfondire il contatto.";
            case "MEDIUM_MATCH" -> "Profilo nella media: alcuni criteri sono soddisfatti ma altri meno. " +
                    "Il " + priceBandLabel(priceBand).toLowerCase() + ". " +
                    "Valuta prima altri candidati più adatti.";
            default -> "Compatibilità debole su uno o più criteri fondamentali. " +
                    "Conviene attendere profili con migliore corrispondenza.";
        };
    }

    private String bandLabel(String band) {
        return switch (band != null ? band : "") {
            case "EXCELLENT_MATCH" -> "Eccellente";
            case "GOOD_MATCH"      -> "Buona";
            case "MEDIUM_MATCH"    -> "Media";
            case "WEAK_MATCH"      -> "Debole";
            default                -> "Non classificata";
        };
    }

    private String priceBandLabel(String priceBand) {
        return switch (priceBand != null ? priceBand : "") {
            case "within_budget"    -> "Prezzo nel budget";
            case "within_tolerance" -> "Prezzo vicino al budget";
            case "over_budget"      -> "Prezzo oltre il budget";
            default                 -> "Dati prezzo non disponibili";
        };
    }
}
