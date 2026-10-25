package com.ragnarok.dto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class TaskStep {

    private String stepId;
    private String skillId;
    private String description;
    private Map<String, Object> parameters = new HashMap<>();
    private List<String> dependsOn = new ArrayList<>();
    private String status = "PENDING"; // PENDING, RUNNING, COMPLETED, FAILED
    private String output;
    private String error;
    private int retryCount = 0;

    public TaskStep() {
    }

    public TaskStep(String stepId, String skillId, String description, Map<String, Object> parameters, List<String> dependsOn) {
        this.stepId = stepId;
        this.skillId = skillId;
        this.description = description;
        this.parameters = parameters != null ? parameters : new HashMap<>();
        this.dependsOn = dependsOn != null ? dependsOn : new ArrayList<>();
    }

    public String getStepId() {
        return stepId;
    }

    public void setStepId(String stepId) {
        this.stepId = stepId;
    }

    public String getSkillId() {
        return skillId;
    }

    public void setSkillId(String skillId) {
        this.skillId = skillId;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Map<String, Object> getParameters() {
        return parameters;
    }

    public void setParameters(Map<String, Object> parameters) {
        this.parameters = parameters;
    }

    public List<String> getDependsOn() {
        return dependsOn;
    }

    public void setDependsOn(List<String> dependsOn) {
        this.dependsOn = dependsOn;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getOutput() {
        return output;
    }

    public void setOutput(String output) {
        this.output = output;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public int getRetryCount() {
        return retryCount;
    }

    public void setRetryCount(int retryCount) {
        this.retryCount = retryCount;
    }
}
