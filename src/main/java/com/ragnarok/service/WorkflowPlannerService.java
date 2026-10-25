package com.ragnarok.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ragnarok.dto.ExecutionPlan;
import com.ragnarok.dto.TaskStep;
import com.ragnarok.skill.SkillRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * FR3.1 (Multi-Step Planning):
 * Breaks down complex user goals into a directed task list (ExecutionPlan) matching available skills.
 */
@Service
public class WorkflowPlannerService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowPlannerService.class);

    private final ChatClient chatClient;
    private final SkillRegistry skillRegistry;
    private final ObjectMapper objectMapper;

    public WorkflowPlannerService(ChatClient chatClient, SkillRegistry skillRegistry) {
        this.chatClient = chatClient;
        this.skillRegistry = skillRegistry;
        this.objectMapper = new ObjectMapper();
    }

    public ExecutionPlan createPlan(String goal) {
        String planId = "plan-" + UUID.randomUUID().toString().substring(0, 8);
        log.info("[WorkflowPlanner] Generating multi-step execution plan for goal: {}", goal);

        List<Map<String, Object>> availableSkills = skillRegistry.getSkillDescriptionsForLlm();
        String skillsJson;
        try {
            skillsJson = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(availableSkills);
        } catch (Exception e) {
            skillsJson = "[]";
        }

        String prompt = """
                You are Ragnarok's Autonomous Workflow Planner.
                Your task is to break down the following high-level user goal into a concrete, sequential or DAG task execution plan.
                
                Available Skills:
                %s
                
                User Goal:
                "%s"
                
                Instructions:
                1. Select only appropriate skills from the Available Skills list.
                2. Note: The environment is Windows with PowerShell. For shell_command, use PowerShell-compatible syntax (e.g. Select-String, Get-Content, Get-ChildItem, echo) or cross-platform CLI tools.
                3. For each step, provide:
                   - "stepId": e.g. "step_1", "step_2"
                   - "skillId": must match an available skillId exactly (e.g. "file_read", "file_write", "shell_command", "http_webhook")
                   - "description": what this step accomplishes
                   - "parameters": key-value map matching the skill's inputSchema
                   - "dependsOn": list of stepIds that must complete before this step runs (can be empty [])
                4. Return ONLY a valid JSON array of objects representing the steps. Do not include markdown code block syntax or explanations outside the JSON.
                
                Example Output:
                [
                  {
                    "stepId": "step_1",
                    "skillId": "file_read",
                    "description": "Read project readme",
                    "parameters": {"filePath": "sample_notes.txt"},
                    "dependsOn": []
                  }
                ]
                """.formatted(skillsJson, goal);

        try {
            String rawResponse = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            String jsonText = extractJsonArray(rawResponse);
            List<TaskStep> steps = objectMapper.readValue(jsonText, new TypeReference<List<TaskStep>>() {});

            ExecutionPlan plan = new ExecutionPlan(planId, goal, steps);
            plan.setSummary("Plan generated with " + steps.size() + " orchestrated steps.");
            return plan;
        } catch (Exception e) {
            log.error("[WorkflowPlanner] Failed to parse plan from LLM: {}", e.getMessage(), e);
            // Fallback single-step plan
            TaskStep fallbackStep = new TaskStep(
                    "step_1",
                    "shell_command",
                    "Execute goal via shell",
                    Map.of("command", "echo 'Analyzing goal: " + goal.replace("'", "") + "'"),
                    Collections.emptyList()
            );
            ExecutionPlan fallbackPlan = new ExecutionPlan(planId, goal, List.of(fallbackStep));
            fallbackPlan.setSummary("Fallback plan created due to parsing: " + e.getMessage());
            return fallbackPlan;
        }
    }

    private String extractJsonArray(String raw) {
        if (raw == null) return "[]";
        String clean = raw.trim();
        int start = clean.indexOf('[');
        int end = clean.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            return clean.substring(start, end + 1);
        }
        return clean;
    }
}
