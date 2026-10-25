package com.ragnarok.skill;

import java.util.Map;

/**
 * Utility for robust, case-insensitive parameter extraction across all skills.
 * Provides resilience against LLM naming variations (e.g. path vs filePath, cmd vs command).
 */
public final class SkillParamUtils {

    private SkillParamUtils() {}

    /**
     * Extracts a String parameter from params by checking candidate keys (case-insensitively).
     */
    public static String extractString(Map<String, Object> params, String... candidateKeys) {
        if (params == null || params.isEmpty() || candidateKeys == null) {
            return null;
        }

        for (String key : candidateKeys) {
            // 1. Direct case-sensitive lookup
            if (params.containsKey(key) && params.get(key) != null) {
                String val = String.valueOf(params.get(key)).trim();
                if (!val.isEmpty()) {
                    return cleanQuotes(val);
                }
            }

            // 2. Case-insensitive lookup
            for (Map.Entry<String, Object> entry : params.entrySet()) {
                if (entry.getKey().equalsIgnoreCase(key) && entry.getValue() != null) {
                    String val = String.valueOf(entry.getValue()).trim();
                    if (!val.isEmpty()) {
                        return cleanQuotes(val);
                    }
                }
            }
        }
        return null;
    }

    /**
     * Extracts an Integer parameter with a default value.
     */
    public static int extractInteger(Map<String, Object> params, int defaultValue, String... candidateKeys) {
        String val = extractString(params, candidateKeys);
        if (val == null) {
            return defaultValue;
        }
        try {
            // Handle cases like "4.0" from JSON floats
            if (val.contains(".")) {
                return (int) Double.parseDouble(val);
            }
            return Integer.parseInt(val);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    /**
     * Extracts a Boolean parameter with a default value.
     */
    public static boolean extractBoolean(Map<String, Object> params, boolean defaultValue, String... candidateKeys) {
        String val = extractString(params, candidateKeys);
        if (val == null) {
            return defaultValue;
        }
        return Boolean.parseBoolean(val) || "1".equals(val) || "yes".equalsIgnoreCase(val);
    }

    private static String cleanQuotes(String val) {
        if (val == null) return null;
        String trimmed = val.trim();
        if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            if (trimmed.length() >= 2) {
                return trimmed.substring(1, trimmed.length() - 1).trim();
            }
        }
        return trimmed;
    }
}
