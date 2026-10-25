package com.ragnarok.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "suggestion_cards")
public class SuggestionCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(length = 64)
    private String actionType = "WORKFLOW"; // WORKFLOW, CHAT_PROMPT, REMINDER

    @Column(columnDefinition = "TEXT")
    private String actionPayload;

    @Column(length = 32, nullable = false)
    private String status = "PENDING"; // PENDING, ACCEPTED, DISMISSED

    private LocalDateTime createdAt;

    public SuggestionCard() {
    }

    public SuggestionCard(Long id, String title, String description, String actionType, String actionPayload, String status, LocalDateTime createdAt) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.actionType = actionType;
        this.actionPayload = actionPayload;
        this.status = status != null ? status : "PENDING";
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getActionPayload() {
        return actionPayload;
    }

    public void setActionPayload(String actionPayload) {
        this.actionPayload = actionPayload;
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
}
