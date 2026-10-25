package com.ragnarok.dto;

public class EmailRequest {

    private String to;
    private String subject;
    private String body;
    private String sessionId;

    public EmailRequest() {}

    public EmailRequest(String to, String subject, String body, String sessionId) {
        this.to = to;
        this.subject = subject;
        this.body = body;
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

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
}
