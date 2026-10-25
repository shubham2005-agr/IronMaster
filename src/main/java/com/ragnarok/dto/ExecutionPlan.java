package com.ragnarok.dto;

import java.util.ArrayList;
import java.util.List;

public class ExecutionPlan {

    private String planId;
    private String goal;
    private String overallStatus = "PENDING"; // PENDING, IN_PROGRESS, COMPLETED, FAILED
    private List<TaskStep> steps = new ArrayList<>();
    private String summary;

    public ExecutionPlan() {
    }

    public ExecutionPlan(String planId, String goal, List<TaskStep> steps) {
        this.planId = planId;
        this.goal = goal;
        this.steps = steps != null ? steps : new ArrayList<>();
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

    public String getOverallStatus() {
        return overallStatus;
    }

    public void setOverallStatus(String overallStatus) {
        this.overallStatus = overallStatus;
    }

    public List<TaskStep> getSteps() {
        return steps;
    }

    public void setSteps(List<TaskStep> steps) {
        this.steps = steps;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }
}
