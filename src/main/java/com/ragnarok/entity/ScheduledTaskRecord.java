package com.ragnarok.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scheduled_tasks")
public class ScheduledTaskRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(nullable = false, length = 64)
    private String cronExpression;

    @Column(nullable = false, length = 128)
    private String goalOrSkillId;

    @Column(columnDefinition = "TEXT")
    private String parametersJson;

    private boolean enabled = true;

    private LocalDateTime lastRun;
    private LocalDateTime nextRun;

    public ScheduledTaskRecord() {
    }

    public ScheduledTaskRecord(Long id, String name, String cronExpression, String goalOrSkillId, String parametersJson, boolean enabled, LocalDateTime lastRun, LocalDateTime nextRun) {
        this.id = id;
        this.name = name;
        this.cronExpression = cronExpression;
        this.goalOrSkillId = goalOrSkillId;
        this.parametersJson = parametersJson;
        this.enabled = enabled;
        this.lastRun = lastRun;
        this.nextRun = nextRun;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCronExpression() {
        return cronExpression;
    }

    public void setCronExpression(String cronExpression) {
        this.cronExpression = cronExpression;
    }

    public String getGoalOrSkillId() {
        return goalOrSkillId;
    }

    public void setGoalOrSkillId(String goalOrSkillId) {
        this.goalOrSkillId = goalOrSkillId;
    }

    public String getParametersJson() {
        return parametersJson;
    }

    public void setParametersJson(String parametersJson) {
        this.parametersJson = parametersJson;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public LocalDateTime getLastRun() {
        return lastRun;
    }

    public void setLastRun(LocalDateTime lastRun) {
        this.lastRun = lastRun;
    }

    public LocalDateTime getNextRun() {
        return nextRun;
    }

    public void setNextRun(LocalDateTime nextRun) {
        this.nextRun = nextRun;
    }
}
