package com.inquilino.service;

import com.inquilino.entity.TenantProfile;
import com.inquilino.onboarding.FiscalCodeValidator;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Map;

/**
 * Analyses an Italian fiscal code (codice fiscale) against the stored profile data.
 * Does NOT require a comuni database — extracts all information directly from the CF.
 */
@Service
public class FiscalCodeAnalysisService {

    private static final char[] MONTH_CODES = {'A','B','C','D','E','H','L','M','P','R','S','T'};

    private static final int[] ODD_VALUES = {
        1,0,5,7,9,13,15,17,19,21,  // 0-9
        1,0,5,7,9,13,15,17,19,21,  // A-J
        2,4,18,20,11,3,6,8,12,14,  // K-T
        16,10,22,25,24,23           // U-Z
    };

    public record FiscalCodeAnalysis(
        String  fiscalCode,
        boolean checksumValid,
        String  inferredGender,     // "M" or "F"
        boolean birthYearMatch,
        boolean birthMonthMatch,
        boolean birthDayMatch,
        String  extractedBelfioreCode,
        String  cfSurnameCode,       // chars 0-2 in CF
        String  cfNameCode,          // chars 3-5 in CF
        String  calculatedSurnameCode, // computed from profile fullName
        String  calculatedNameCode,    // computed from profile fullName
        boolean surnameCodeMatch,
        boolean nameCodeMatch
    ) {}

    public FiscalCodeAnalysis analyse(TenantProfile profile) {
        String cf = profile.getFiscalCode();
        if (cf == null || cf.isBlank()) return null;

        cf = cf.trim().toUpperCase();
        if (cf.length() != 16) return null;

        boolean checksumValid = FiscalCodeValidator.isValid(cf);

        // Extract fields from CF
        String cfSurname = cf.substring(0, 3);
        String cfName    = cf.substring(3, 6);
        int cfYearInt    = Integer.parseInt(cf.substring(6, 8));
        char cfMonthChar = cf.charAt(8);
        int cfDayRaw     = Integer.parseInt(cf.substring(9, 11));
        String belfiore  = cf.substring(11, 15);

        // Infer gender
        boolean female = cfDayRaw > 40;
        int cfDay      = female ? cfDayRaw - 40 : cfDayRaw;
        String gender  = female ? "F" : "M";

        // Month from letter
        int cfMonth = -1;
        for (int i = 0; i < MONTH_CODES.length; i++) {
            if (MONTH_CODES[i] == cfMonthChar) { cfMonth = i + 1; break; }
        }

        // Compare with profile birth date
        LocalDate bd = profile.getBirthDate();
        boolean yearMatch  = bd != null && (bd.getYear() % 100) == cfYearInt;
        boolean monthMatch = bd != null && cfMonth > 0 && bd.getMonthValue() == cfMonth;
        boolean dayMatch   = bd != null && bd.getDayOfMonth() == cfDay;

        // Compute name/surname codes from fullName
        String fullName = profile.getFullName() != null ? normalize(profile.getFullName()) : "";
        String[] parts  = fullName.trim().split("\\s+", 2);
        String calcSurname = "", calcName = "";
        boolean surnameMatch = false, nameMatch = false;

        if (parts.length == 2) {
            // Try both orderings (nome cognome vs cognome nome)
            String opt1Surname = surnameCode(parts[0]);
            String opt1Name    = nameCode(parts[1]);
            String opt2Surname = surnameCode(parts[1]);
            String opt2Name    = nameCode(parts[0]);

            // Pick the ordering that gives more matches
            int score1 = (opt1Surname.equals(cfSurname) ? 1 : 0) + (opt1Name.equals(cfName) ? 1 : 0);
            int score2 = (opt2Surname.equals(cfSurname) ? 1 : 0) + (opt2Name.equals(cfName) ? 1 : 0);

            if (score2 > score1) {
                calcSurname = opt2Surname; calcName = opt2Name;
            } else {
                calcSurname = opt1Surname; calcName = opt1Name;
            }
        } else if (parts.length == 1 && !parts[0].isEmpty()) {
            calcSurname = surnameCode(parts[0]);
            calcName    = nameCode(parts[0]);
        }

        surnameMatch = !calcSurname.isEmpty() && calcSurname.equals(cfSurname);
        nameMatch    = !calcName.isEmpty()    && calcName.equals(cfName);

        return new FiscalCodeAnalysis(
            cf, checksumValid, gender,
            yearMatch, monthMatch, dayMatch,
            belfiore,
            cfSurname, cfName,
            calcSurname, calcName,
            surnameMatch, nameMatch
        );
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    private static String normalize(String s) {
        return s.toUpperCase()
            .replace('À','A').replace('È','E').replace('É','E')
            .replace('Ì','I').replace('Ò','O').replace('Ù','U')
            .replaceAll("[^A-Z ]", "");
    }

    static String surnameCode(String s) {
        String consonants = s.chars().filter(c -> "BCDFGHJKLMNPQRSTVWXYZ".indexOf(c) >= 0)
            .collect(StringBuilder::new, (sb,c) -> sb.append((char)c), StringBuilder::append).toString();
        String vowels = s.chars().filter(c -> "AEIOU".indexOf(c) >= 0)
            .collect(StringBuilder::new, (sb,c) -> sb.append((char)c), StringBuilder::append).toString();
        return (consonants + vowels + "XXX").substring(0, 3);
    }

    static String nameCode(String s) {
        String consonants = s.chars().filter(c -> "BCDFGHJKLMNPQRSTVWXYZ".indexOf(c) >= 0)
            .collect(StringBuilder::new, (sb,c) -> sb.append((char)c), StringBuilder::append).toString();
        if (consonants.length() >= 4) {
            return "" + consonants.charAt(0) + consonants.charAt(2) + consonants.charAt(3);
        }
        String vowels = s.chars().filter(c -> "AEIOU".indexOf(c) >= 0)
            .collect(StringBuilder::new, (sb,c) -> sb.append((char)c), StringBuilder::append).toString();
        return (consonants + vowels + "XXX").substring(0, 3);
    }
}
