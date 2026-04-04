package com.inquilino.onboarding;

import com.inquilino.entity.OnboardingState;
import com.inquilino.entity.User;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

public record OnboardingContext(OnboardingState state, User user, Locale locale) {

    public Map<String, Object> data() {
        return state.getCollectedData() != null ? state.getCollectedData() : Map.of();
    }

    public boolean hasData(String key) {
        Object v = data().get(key);
        if (v == null) return false;
        if (v instanceof String s) return !s.isBlank();
        if (v instanceof List<?> l) return !l.isEmpty();
        if (v instanceof Boolean) return true;  // false AND true both mean "field was answered"
        return true;
    }

    /** Reads a boolean flag that may have been stored as Boolean or String. */
    public boolean getBooleanData(String key) {
        Object v = data().get(key);
        if (v instanceof Boolean b) return b;
        if (v instanceof String s) return "true".equalsIgnoreCase(s);
        return false;
    }

    public boolean isItalian() {
        return "it".equals(locale.getLanguage());
    }

    public String lang() {
        return isItalian() ? "Italian" : "English";
    }

    /** Formats collected data for insertion into system prompts (skips internal _ fields). */
    public String formattedData() {
        Map<String, Object> d = data();
        if (d.isEmpty()) return "None collected yet.";
        return d.entrySet().stream()
                .filter(e -> !e.getKey().startsWith("_"))
                .map(e -> "  - " + e.getKey() + ": " + e.getValue())
                .collect(Collectors.joining("\n"));
    }
}
