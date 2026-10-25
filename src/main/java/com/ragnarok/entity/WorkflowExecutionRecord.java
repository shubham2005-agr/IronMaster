package com.ragnarok.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "workflow_executions")
public class WorkflowExecutionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String planId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String goal;

    @Column(length = 32, nullable = false)
    private String status = "PENDING"; // PENDING, IN_PROGRESS, COMPLETED, FAILED

    @Column(columnDefinition = "LONGTEXT")
    private String stepsJson;

    @Column(columnDefinition = "TEXT")
    private String summary;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public WorkflowExecutionRecord() {
    }

    public WorkflowExecutionRecord(Long id, String planId, String goal, String status, String stepsJson, String summary, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.planId = planId;
        this.goal = goal;
        this.status = status;
        this.stepsJson = stepsJson;
        this.summary = summary;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getPlanId() {
        return planId;
    }

    public void setPlanId(String planId) {
        this.planId = planId;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStepsJson() {
        return stepsJson;
    }

    public void setStepsJson(String stepsJson) {
        this.stepsJson = stepsJson;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
