package com.ragnarok.dto;

import java.time.LocalDateTime;

public class EmailDraft {

    private String draftId;
    private String sessionId;
    private String to;
    private String subject;
    private String body;
    private String status; // PENDING_CONFIRMATION, SENT, CANCELLED
    private LocalDateTime createdAt;
    private LocalDateTime sentAt;

    public EmailDraft() {
        this.createdAt = LocalDateTime.now();
        this.status = "PENDING_CONFIRMATION";
    }

    public EmailDraft(String draftId, String sessionId, String to, String subject, String body) {
        this.draftId = draftId;
        this.sessionId = sessionId;
        this.to = to;
        this.subject = subject;
        this.body = body;
        this.status = "PENDING_CONFIRMATION";
        this.createdAt = LocalDateTime.now();
    }

    public String getDraftId() {
        return draftId;
    }

    public void setDraftId(String draftId) {
        this.draftId = draftId;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }
}
