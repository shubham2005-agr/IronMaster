package com.ragnarok.controller;

import com.ragnarok.dto.ExecutionPlan;
import com.ragnarok.entity.WorkflowExecutionRecord;
import com.ragnarok.repository.WorkflowExecutionRepository;
import com.ragnarok.service.WorkflowOrchestrator;
import com.ragnarok.service.WorkflowPlannerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workflow")
public class WorkflowController {

    private final WorkflowPlannerService plannerService;
    private final WorkflowOrchestrator orchestrator;
    private final WorkflowExecutionRepository executionRepository;

    public WorkflowController(
            WorkflowPlannerService plannerService,
            WorkflowOrchestrator orchestrator,
            WorkflowExecutionRepository executionRepository) {
        this.plannerService = plannerService;
        this.orchestrator = orchestrator;
        this.executionRepository = executionRepository;
    }

    @PostMapping("/plan")
    public ResponseEntity<ExecutionPlan> generatePlan(@RequestBody Map<String, String> request) {
        String goal = request.get("goal");
        if (goal == null || goal.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        ExecutionPlan plan = plannerService.createPlan(goal);
        return ResponseEntity.ok(plan);
    }

    @PostMapping("/execute")
    public ResponseEntity<ExecutionPlan> executeWorkflow(@RequestBody Map<String, String> request) {
        String goal = request.get("goal");
        if (goal == null || goal.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        ExecutionPlan plan = plannerService.createPlan(goal);
        ExecutionPlan executedPlan = orchestrator.executePlan(plan);
        return ResponseEntity.ok(executedPlan);
    }

    @GetMapping("/executions")
    public ResponseEntity<List<WorkflowExecutionRecord>> listExecutions() {
        return ResponseEntity.ok(executionRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/executions/{planId}")
    public ResponseEntity<WorkflowExecutionRecord> getExecution(@PathVariable String planId) {
        return executionRepository.findByPlanId(planId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/executions/{planId}/retry")
    public ResponseEntity<ExecutionPlan> retryWorkflow(@PathVariable String planId) {
        try {
            ExecutionPlan plan = orchestrator.reExecutePlan(planId);
            return ResponseEntity.ok(plan);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
