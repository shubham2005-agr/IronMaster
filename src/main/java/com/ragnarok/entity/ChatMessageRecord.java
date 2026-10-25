package com.ragnarok.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
public class ChatMessageRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sessionId;

    @Column(nullable = false)
    private String role; // "USER", "ASSISTANT", "SYSTEM"

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(length = 32)
    private String status = "SUCCESS"; // "SUCCESS", "FAILED"

    @Column(columnDefinition = "TEXT")
    private String metadata; // JSON or contextual metadata

    private LocalDateTime timestamp;

    public ChatMessageRecord() {
    }

    public ChatMessageRecord(Long id, String sessionId, String role, String content, String status, String metadata, LocalDateTime timestamp) {
        this.id = id;
        this.sessionId = sessionId;
        this.role = role;
        this.content = content;
        this.status = status != null ? status : "SUCCESS";
        this.metadata = metadata;
        this.timestamp = timestamp;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String sessionId;
        private String role;
        private String content;
        private String status = "SUCCESS";
        private String metadata;
        private LocalDateTime timestamp;

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder sessionId(String sessionId) {
            this.sessionId = sessionId;
            return this;
        }

        public Builder conversationId(String conversationId) {
            this.sessionId = conversationId;
            return this;
        }

        public Builder role(String role) {
            this.role = role;
            return this;
        }

        public Builder content(String content) {
            this.content = content;
            return this;
        }

        public Builder status(String status) {
            this.status = status;
            return this;
        }

        public Builder metadata(String metadata) {
            this.metadata = metadata;
            return this;
        }

        public Builder timestamp(LocalDateTime timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public ChatMessageRecord build() {
            return new ChatMessageRecord(id, sessionId, role, content, status, metadata, timestamp);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    // Alias for conversationId
    public String getConversationId() {
        return sessionId;
    }

    public void setConversationId(String conversationId) {
        this.sessionId = conversationId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
