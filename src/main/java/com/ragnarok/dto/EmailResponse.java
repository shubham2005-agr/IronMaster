package com.ragnarok.dto;

import java.time.LocalDateTime;

public class EmailResponse {

    private boolean success;
    private String message;
    private String to;
    private String subject;
    private String draftId;
    private LocalDateTime timestamp;

    public EmailResponse() {
        this.timestamp = LocalDateTime.now();
    }

    public EmailResponse(boolean success, String message, String to, String subject) {
        this.success = success;
        this.message = message;
        this.to = to;
        this.subject = subject;
        this.timestamp = LocalDateTime.now();
    }

    public EmailResponse(boolean success, String message, String to, String subject, String draftId) {
        this.success = success;
        this.message = message;
        this.to = to;
        this.subject = subject;
        this.draftId = draftId;
        this.timestamp = LocalDateTime.now();
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
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

    public String getDraftId() {
        return draftId;
    }

    public void setDraftId(String draftId) {
        this.draftId = draftId;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
