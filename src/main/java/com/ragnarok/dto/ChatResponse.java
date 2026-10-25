package com.ragnarok.dto;

public class ChatResponse {
    private String sessionId;
    private String response;

    public ChatResponse() {
    }

    public ChatResponse(String sessionId, String response) {
        this.sessionId = sessionId;
        this.response = response;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getResponse() {
        return response;
    }

    public void setResponse(String response) {
        this.response = response;
    }
}
