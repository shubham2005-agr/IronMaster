package com.ragnarok.dto;

public class MemoryItemDto {
    private String sessionId;
    private String text;
    private String category;

    public MemoryItemDto() {
    }

    public MemoryItemDto(String sessionId, String text, String category) {
        this.sessionId = sessionId;
        this.text = text;
        this.category = category;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
