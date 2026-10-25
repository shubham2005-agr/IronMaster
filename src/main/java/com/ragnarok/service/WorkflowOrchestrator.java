package com.ragnarok.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ragnarok.dto.ExecutionPlan;
import com.ragnarok.dto.TaskStep;
import com.ragnarok.entity.WorkflowExecutionRecord;
import com.ragnarok.repository.WorkflowExecutionRepository;
import com.ragnarok.skill.AgentSkill;
import com.ragnarok.skill.SkillRegistry;
import com.ragnarok.skill.SkillResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * FR3.1 & FR3.3 (Autonomous Workflow Orchestration & Self-Correction):
 * Executes planned DAG steps, passes outputs, triggers LLM reflection on failure (up to 2 retries),
 * supports dynamic skill switching during self-correction, and checkpoints execution state into MySQL.
 */
@Service
public class WorkflowOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(WorkflowOrchestrator.class);
    private static final int MAX_RETRIES = 2;

    private final SkillRegistry skillRegistry;
    private final WorkflowExecutionRepository executionRepository;
    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public WorkflowOrchestrator(
            SkillRegistry skillRegistry,
            WorkflowExecutionRepository executionRepository,
            ChatClient chatClient) {
        this.skillRegistry = skillRegistry;
        this.executionRepository = executionRepository;
        this.chatClient = chatClient;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.configure(com.fasterxml.jackson.core.json.JsonReadFeature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER.mappedFeature(), true);
        this.objectMapper.configure(com.fasterxml.jackson.core.json.JsonReadFeature.ALLOW_UNESCAPED_CONTROL_CHARS.mappedFeature(), true);
    }

    @Transactional
    public ExecutionPlan executePlan(ExecutionPlan plan) {
        plan.setOverallStatus("IN_PROGRESS");
        checkpointPlan(plan);

        Map<String, TaskStep> completedSteps = new HashMap<>();

        for (TaskStep step : plan.getSteps()) {
            // Check dependencies
            if (step.getDependsOn() != null && !step.getDependsOn().isEmpty()) {
                boolean allDependenciesMet = step.getDependsOn().stream()
                        .allMatch(depId -> completedSteps.containsKey(depId) && "COMPLETED".equalsIgnoreCase(completedSteps.get(depId).getStatus()));
                if (!allDependenciesMet) {
                    step.setStatus("PENDING");
                    log.warn("[WorkflowOrchestrator] Step '{}' skipped because dependencies were not satisfied: {}",
                            step.getStepId(), step.getDependsOn());
                    continue;
                }
            }

            step.setStatus("RUNNING");
            checkpointPlan(plan);

            // Interpolate previous outputs into parameters if referenced
            Map<String, Object> resolvedParams = resolveStepParameters(step.getParameters(), completedSteps);

            SkillResult result = executeStepWithSelfCorrection(step, resolvedParams);

            if (result.isSuccess()) {
                step.setStatus("COMPLETED");
                step.setOutput(result.getOutput());
                completedSteps.put(step.getStepId(), step);
            } else {
                step.setStatus("FAILED");
                step.setError(result.getError());
                plan.setOverallStatus("FAILED");
                checkpointPlan(plan);
                return plan;
            }

            checkpointPlan(plan);
        }

        long completedCount = plan.getSteps().stream().filter(s -> "COMPLETED".equalsIgnoreCase(s.getStatus())).count();
        if (completedCount == plan.getSteps().size()) {
            plan.setOverallStatus("COMPLETED");
            plan.setSummary("All " + plan.getSteps().size() + " steps completed successfully.");
        } else {
            plan.setOverallStatus("PARTIAL_SUCCESS");
            plan.setSummary(completedCount + " of " + plan.getSteps().size() + " steps completed successfully.");
        }

        checkpointPlan(plan);
        return plan;
    }

    public ExecutionPlan reExecutePlan(String planId) {
        Optional<WorkflowExecutionRecord> recordOpt = executionRepository.findByPlanId(planId);
        if (recordOpt.isEmpty()) {
            throw new IllegalArgumentException("Plan not found: " + planId);
        }
        WorkflowExecutionRecord record = recordOpt.get();
        try {
            List<TaskStep> steps = objectMapper.readValue(record.getStepsJson(), new TypeReference<List<TaskStep>>() {});
            for (TaskStep s : steps) {
                if (!"COMPLETED".equalsIgnoreCase(s.getStatus())) {
                    s.setStatus("PENDING");
                    s.setOutput(null);
                    s.setError(null);
                    s.setRetryCount(0);
                }
            }
            ExecutionPlan plan = new ExecutionPlan(record.getPlanId(), record.getGoal(), steps);
            return executePlan(plan);
        } catch (Exception e) {
            throw new RuntimeException("Failed to re-execute plan: " + e.getMessage(), e);
        }
    }

    private SkillResult executeStepWithSelfCorrection(TaskStep step, Map<String, Object> currentParams) {
        int attempt = 0;
        Map<String, Object> paramsToTry = new HashMap<>(currentParams);

        while (attempt <= MAX_RETRIES) {
            Optional<AgentSkill> skillOpt = skillRegistry.getSkill(step.getSkillId());
            if (skillOpt.isEmpty()) {
                return SkillResult.failure("Skill not found in registry: " + step.getSkillId());
            }

            AgentSkill skill = skillOpt.get();
            log.info("[WorkflowOrchestrator] Running step '{}' with skill '{}' (attempt {})",
                    step.getStepId(), step.getSkillId(), attempt + 1);

            SkillResult result = skill.execute(paramsToTry);

            if (result.isSuccess()) {
                return result;
            }

            // Self-Correction & Reflection (FR3.3)
            attempt++;
            step.setRetryCount(attempt);
            if (attempt <= MAX_RETRIES) {
                log.warn("[WorkflowOrchestrator] Step '{}' failed: {}. Triggering LLM reflection for retry #{}...",
                        step.getStepId(), result.getError(), attempt);
                paramsToTry = reflectAndReviseParameters(step, result.getError(), paramsToTry);
            } else {
                log.error("[WorkflowOrchestrator] Step '{}' exhausted maximum {} retries.", step.getStepId(), MAX_RETRIES);
                return result;
            }
        }

        return SkillResult.failure("Step failed after " + MAX_RETRIES + " retries.");
    }

    /**
     * FR3.3 Self-Correction & Reflection Prompt
     */
    private Map<String, Object> reflectAndReviseParameters(TaskStep step, String errorMsg, Map<String, Object> failedParams) {
        List<Map<String, Object>> skills = skillRegistry.getSkillDescriptionsForLlm();
        String prompt = """
                You are Ragnarok's Self-Correction and Reflection Engine.
                A task step failed during workflow execution on Windows.
                
                Step ID: %s
                Current Skill ID: %s
                Failed Parameters: %s
                Error Message: %s
                
                Available Skills: %s
                
                Instructions:
                1. Diagnose the root cause of the error.
                2. If a shell command failed because a Linux command (e.g. grep, sed, awk) does not exist on Windows, you can:
                   a) Switch skill to 'file_search' with parameters: {"filePath": "...", "pattern": "..."}
                   b) Or rewrite using Windows PowerShell: {"command": "Select-String -Path ... -Pattern ..."}
                3. You can either return revised parameters directly: { ... }
                   OR switch skill: {"skillId": "new_skill_id", "parameters": { ... }}
                4. Return ONLY valid JSON.
                """.formatted(step.getStepId(), step.getSkillId(), failedParams.toString(), errorMsg, skills.toString());

        try {
            String rawJson = chatClient.prompt().user(prompt).call().content();
            String clean = extractJsonObject(rawJson);
            Map<String, Object> parsed = objectMapper.readValue(clean, new TypeReference<Map<String, Object>>() {});

            if (parsed.containsKey("skillId")) {
                String newSkillId = parsed.get("skillId").toString();
                if (skillRegistry.getSkill(newSkillId).isPresent()) {
                    log.info("[WorkflowOrchestrator] Self-correction switching step '{}' skill from '{}' to '{}'",
                            step.getStepId(), step.getSkillId(), newSkillId);
                    step.setSkillId(newSkillId);
                }
            }

            if (parsed.containsKey("parameters") && parsed.get("parameters") instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> newParams = (Map<String, Object>) parsed.get("parameters");
                return newParams;
            }

            parsed.remove("skillId");
            parsed.remove("diagnosis");
            parsed.remove("explanation");
            parsed.remove("reason");
            if (!parsed.isEmpty()) {
                return parsed;
            }
            return autoHealParameters(step, errorMsg, failedParams);
        } catch (Exception e) {
            log.warn("[WorkflowOrchestrator] Reflection parsing error: {}. Triggering deterministic auto-heal.", e.getMessage());
            return autoHealParameters(step, errorMsg, failedParams);
        }
    }

    private Map<String, Object> autoHealParameters(TaskStep step, String errorMsg, Map<String, Object> failedParams) {
        Map<String, Object> healed = new HashMap<>(failedParams);
        String err = errorMsg != null ? errorMsg.toLowerCase() : "";

        // Auto-heal 1: grep error -> switch to file_search
        if (err.contains("grep") && "shell_command".equalsIgnoreCase(step.getSkillId())) {
            log.info("[WorkflowOrchestrator] Auto-healing: Converting failed 'grep' shell command to 'file_search'");
            step.setSkillId("file_search");
            String cmd = String.valueOf(failedParams.getOrDefault("command", ""));
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("([\\w-]+\\.[a-zA-Z0-9]+)").matcher(cmd);
            if (m.find()) {
                healed.put("filePath", m.group(1));
            }
            java.util.regex.Matcher pm = java.util.regex.Pattern.compile("grep\\s+(?:-[a-zA-Z]+\\s+)?['\"]?([^'\"\\s]+)['\"]?").matcher(cmd);
            if (pm.find()) {
                healed.put("pattern", pm.group(1));
            }
            return healed;
        }

        // Auto-heal 2: PowerShell ls -la flag error
        if (err.contains("parameter cannot be found that matches parameter name 'la'") && healed.containsKey("command")) {
            String cmd = healed.get("command").toString().replaceAll("-[a-zA-Z]*l[a-zA-Z]*", "").trim();
            healed.put("command", cmd);
            return healed;
        }

        // Auto-heal 3: Path leading slash on Windows
        if (healed.containsKey("filePath")) {
            String p = healed.get("filePath").toString().replaceFirst("^[\\\\/]+", "");
            healed.put("filePath", p);
            return healed;
        }

        return healed;
    }

    private Map<String, Object> resolveStepParameters(Map<String, Object> params, Map<String, TaskStep> completedSteps) {
        if (params == null) return new HashMap<>();
        Map<String, Object> resolved = new HashMap<>();

        for (Map.Entry<String, Object> entry : params.entrySet()) {
            if (entry.getValue() instanceof String strVal) {
                // Interpolate {{step_id.output}}
                for (Map.Entry<String, TaskStep> completed : completedSteps.entrySet()) {
                    String placeholder = "{{" + completed.getKey() + ".output}}";
                    if (strVal.contains(placeholder) && completed.getValue().getOutput() != null) {
                        strVal = strVal.replace(placeholder, completed.getValue().getOutput());
                    }
                }
                resolved.put(entry.getKey(), strVal);
            } else {
                resolved.put(entry.getKey(), entry.getValue());
            }
        }
        return resolved;
    }

    private void checkpointPlan(ExecutionPlan plan) {
        try {
            LocalDateTime now = LocalDateTime.now();
            String stepsJson = objectMapper.writeValueAsString(plan.getSteps());

            executionRepository.findByPlanId(plan.getPlanId()).ifPresentOrElse(
                    existing -> {
                        existing.setStatus(plan.getOverallStatus());
                        existing.setStepsJson(stepsJson);
                        existing.setSummary(plan.getSummary());
                        existing.setUpdatedAt(now);
                        executionRepository.save(existing);
                    },
                    () -> {
                        WorkflowExecutionRecord record = new WorkflowExecutionRecord(
                                null,
                                plan.getPlanId(),
                                plan.getGoal(),
                                plan.getOverallStatus(),
                                stepsJson,
                                plan.getSummary(),
                                now,
                                now
                        );
                        executionRepository.save(record);
                    }
            );
        } catch (Exception e) {
            log.error("[WorkflowOrchestrator] Failed to checkpoint execution: {}", e.getMessage());
        }
    }

    private String extractJsonObject(String raw) {
        if (raw == null) return "{}";
        String clean = raw.trim();
        int start = clean.indexOf('{');
        int end = clean.lastIndexOf('}');
        if (start != -1 && end != -1 && end > start) {
            return clean.substring(start, end + 1);
        }
        return clean;
    }
}
