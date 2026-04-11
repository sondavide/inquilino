package com.inquilino.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

/**
 * Genera le descrizioni AI di compatibilità per ogni match, in italiano e in inglese.
 * Usata da MatchingService per popolare Match.matchSummary/matchSummaryEn
 * e Match.tenantMatchSummary/tenantMatchSummaryEn.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MatchSummaryService {

    private final ChatClient chatClient;

    // ─── Locatore ─────────────────────────────────────────────────────────────

    /**
     * Genera la descrizione di compatibilità dal punto di vista del locatore.
     *
     * @param lang  "it" | "en"
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
            String municipality,
            String lang) {
        boolean en = "en".equals(lang);
        try {
            String prompt = buildLandlordPrompt(matchBand, geoScore, priceScore, timingScore,
                    fitScore, tenantStrength, priceBand, occupationLabel, municipality, en);
            return chatClient.prompt().user(prompt).call().content();
        } catch (Exception e) {
            log.warn("MatchSummaryService: generazione landlord ({}) fallita. Causa: {}", lang, e.getMessage());
            return landlordFallback(matchBand, priceBand, tenantStrength, en);
        }
    }

    private String buildLandlordPrompt(String band, double geo, double price, double timing,
                                        double fit, double strength, String priceBand,
                                        String occupation, String municipality, boolean en) {
        String langInstr   = en ? "Reply in English in 2-3 concise sentences (neutral tone). End with a brief recommendation for the landlord (e.g. \"Recommend proceeding.\" or \"Wait for better candidates.\"). No bullet points."
                                : "Rispondi in italiano in 2-3 frasi concise (tono neutro). Concludi con un breve consiglio per il locatore (es. \"Si consiglia di procedere.\" o \"Attendere candidati più adatti.\"). Non usare elenchi puntati.";
        String geoQual     = en ? (geo >= 80 ? "(excellent)" : geo >= 50 ? "(good)" : "(fair)")
                                : (geo >= 80 ? "(ottima)"    : geo >= 50 ? "(buona)"  : "(discreta)");
        String noData      = en ? "not specified" : "non specificata";
        return """
                You are a professional real estate assistant. Describe the compatibility between this tenant and the listing. %s

                Match data:
                - Overall compatibility: %s
                - Location score: %d/100 %s
                - Price score: %d/100 (%s)
                - Timing score: %d/100
                - Lifestyle fit: %d/100
                - Tenant profile strength: %d/100
                - Occupation: %s
                - City: %s
                """.formatted(
                langInstr,
                bandLabel(band, en),
                Math.round(geo), geoQual,
                Math.round(price), priceBandLabel(priceBand, en),
                Math.round(timing),
                Math.round(fit),
                Math.round(strength),
                occupation != null ? occupation : noData,
                municipality != null ? municipality : noData
        );
    }

    private String landlordFallback(String band, String priceBand, double strength, boolean en) {
        return switch (band != null ? band : "") {
            case "EXCELLENT_MATCH" -> en
                    ? "Excellent profile with high compatibility on all criteria. Price is within budget and location is aligned. Recommend proceeding with the contact invitation."
                    : "Profilo eccellente con alta compatibilità su tutti i criteri. Il prezzo rientra nel budget e la zona è allineata. Si consiglia di procedere con l'invito al contatto.";
            case "GOOD_MATCH" -> en
                    ? "Good profile with solid compatibility on location and price. Minor discrepancies on secondary details. Worth exploring contact."
                    : "Buon profilo con compatibilità solida su zona e prezzo. Qualche piccola discrepanza nei dettagli secondari. Vale la pena approfondire il contatto.";
            case "MEDIUM_MATCH" -> en
                    ? "Average compatibility: some criteria are met but others less so. " + priceBandLabel(priceBand, true) + ". Consider other candidates first."
                    : "Profilo nella media: alcuni criteri sono soddisfatti ma altri meno. " + priceBandLabel(priceBand, false).toLowerCase() + ". Valuta prima altri candidati più adatti.";
            default -> en
                    ? "Weak compatibility on one or more key criteria. It is advisable to wait for better matching profiles."
                    : "Compatibilità debole su uno o più criteri fondamentali. Conviene attendere profili con migliore corrispondenza.";
        };
    }

    // ─── Inquilino ────────────────────────────────────────────────────────────

    /**
     * Genera la descrizione di compatibilità dal punto di vista dell'inquilino.
     *
     * @param lang  "it" | "en"
     */
    public String generateForTenant(
            String matchBand,
            double geoScore,
            double priceScore,
            double timingScore,
            double fitScore,
            String priceBand,
            String municipality,
            boolean petsAllowed,
            Integer maxOccupants,
            String furnishedStatus,
            String lang) {
        boolean en = "en".equals(lang);
        try {
            String prompt = buildTenantPrompt(matchBand, geoScore, priceScore, timingScore,
                    fitScore, priceBand, municipality, petsAllowed, maxOccupants, furnishedStatus, en);
            return chatClient.prompt().user(prompt).call().content();
        } catch (Exception e) {
            log.warn("MatchSummaryService: generazione tenant ({}) fallita. Causa: {}", lang, e.getMessage());
            return tenantFallback(matchBand, priceBand, en);
        }
    }

    private String buildTenantPrompt(String band, double geo, double price, double timing,
                                      double fit, String priceBand, String municipality,
                                      boolean petsAllowed, Integer maxOccupants, String furnishedStatus,
                                      boolean en) {
        String langInstr = en
                ? "Reply in English in 2-3 concise friendly sentences addressed to the tenant (use \"this apartment\", \"the area\", \"the rent\"). No bullet points."
                : "Rispondi in italiano in 2-3 frasi concise e amichevoli rivolte all'inquilino (usa \"questo appartamento\", \"la zona\", \"il canone\"). Non usare elenchi puntati.";
        String geoQual   = en ? (geo >= 80 ? "(excellent)" : geo >= 50 ? "(good)" : "(fair)")
                              : (geo >= 80 ? "(ottima)"    : geo >= 50 ? "(buona)"  : "(discreta)");
        String furnished = furnishedStatus != null ? switch (furnishedStatus) {
            case "furnished"           -> en ? "furnished"            : "arredato";
            case "partially_furnished" -> en ? "partially furnished"  : "parzialmente arredato";
            case "unfurnished"         -> en ? "unfurnished"          : "non arredato";
            default                    -> en ? "not specified"        : "non specificato";
        } : (en ? "not specified" : "non specificato");
        String noData    = en ? "not specified" : "non specificato";
        return """
                You are a real estate assistant. Describe how well this apartment suits the tenant. %s

                Match data:
                - Overall compatibility: %s
                - Location score: %d/100 %s
                - Price score: %d/100 (%s)
                - Timing score: %d/100
                - Lifestyle fit: %d/100
                - City: %s
                - Pets allowed: %s
                - Max occupants: %s
                - Furnishing: %s
                """.formatted(
                langInstr,
                bandLabel(band, en),
                Math.round(geo), geoQual,
                Math.round(price), priceBandLabel(priceBand, en),
                Math.round(timing),
                Math.round(fit),
                municipality != null ? municipality : noData,
                en ? (petsAllowed ? "yes" : "no") : (petsAllowed ? "sì" : "no"),
                maxOccupants != null ? maxOccupants.toString() : noData,
                furnished
        );
    }

    private String tenantFallback(String band, String priceBand, boolean en) {
        return switch (band != null ? band : "") {
            case "EXCELLENT_MATCH" -> en
                    ? "This apartment is an excellent match for your preferences. The area and rent are perfectly in line with what you are looking for. Definitely worth a closer look!"
                    : "Questo appartamento si adatta molto bene alle tue preferenze. La zona e il canone sono in linea con quello che cerchi. Vale sicuramente la pena approfondire!";
            case "GOOD_MATCH" -> en
                    ? "This apartment matches your needs well. " + priceBandLabel(priceBand, true) + ". It could be a good choice."
                    : "Questo appartamento corrisponde bene alle tue esigenze. " + priceBandLabel(priceBand, false) + ". Potrebbe essere una buona scelta.";
            case "MEDIUM_MATCH" -> en
                    ? "This apartment meets some of your preferences. " + priceBandLabel(priceBand, true) + ". Consider carefully whether it fits your priorities."
                    : "Questo appartamento soddisfa alcune delle tue preferenze. " + priceBandLabel(priceBand, false).toLowerCase() + ". Valuta con attenzione se risponde alle tue priorità.";
            default -> en
                    ? "This apartment differs in some ways from what you are looking for. Consider whether the differences are acceptable before proceeding."
                    : "Questo appartamento presenta alcune differenze rispetto a quello che cerchi. Valuta se le differenze sono accettabili prima di procedere.";
        };
    }

    // ─── Utility ─────────────────────────────────────────────────────────────

    private String bandLabel(String band, boolean en) {
        return switch (band != null ? band : "") {
            case "EXCELLENT_MATCH" -> en ? "Excellent" : "Eccellente";
            case "GOOD_MATCH"      -> en ? "Good"      : "Buona";
            case "MEDIUM_MATCH"    -> en ? "Average"   : "Media";
            case "WEAK_MATCH"      -> en ? "Weak"      : "Debole";
            default                -> en ? "Unclassified" : "Non classificata";
        };
    }

    private String priceBandLabel(String priceBand, boolean en) {
        return switch (priceBand != null ? priceBand : "") {
            case "within_budget"    -> en ? "Price within budget"       : "Prezzo nel budget";
            case "within_tolerance" -> en ? "Price close to budget"     : "Prezzo vicino al budget";
            case "over_budget"      -> en ? "Price over budget"         : "Prezzo oltre il budget";
            default                 -> en ? "Price data not available"  : "Dati prezzo non disponibili";
        };
    }
}
