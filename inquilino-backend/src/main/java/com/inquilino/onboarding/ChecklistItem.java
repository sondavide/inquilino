package com.inquilino.onboarding;

import java.util.List;
import java.util.Map;

public record ChecklistItem(String key, String labelIt, String labelEn, boolean required) {

    public boolean isCollected(Map<String, Object> data) {
        if (data == null) return false;
        Object v = data.get(key);
        if (v == null) return false;
        if (v instanceof String s) return !s.isBlank();
        if (v instanceof List<?> l) return !l.isEmpty();
        if (v instanceof Boolean) return true;  // false and true both mean "field was answered"
        return true;
    }
}
