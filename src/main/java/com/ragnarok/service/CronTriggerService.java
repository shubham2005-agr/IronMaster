package com.ragnarok.service;

import com.ragnarok.entity.ScheduledTaskRecord;
import com.ragnarok.repository.ScheduledTaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * FR4.1 (Continuous Interaction - CronTriggerService):
 * Checks user-defined scheduled tasks and triggers goals/workflows autonomously.
 */
@Service
public class CronTriggerService {

    private static final Logger log = LoggerFactory.getLogger(CronTriggerService.class);

    private final ScheduledTaskRepository scheduledTaskRepository;
    private final WorkflowPlannerService plannerService;
    private final WorkflowOrchestrator orchestrator;

    public CronTriggerService(
            ScheduledTaskRepository scheduledTaskRepository,
            WorkflowPlannerService plannerService,
            WorkflowOrchestrator orchestrator) {
        this.scheduledTaskRepository = scheduledTaskRepository;
        this.plannerService = plannerService;
        this.orchestrator = orchestrator;
    }

    /**
     * Periodic check every 60 seconds for active cron tasks.
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void evaluateScheduledTasks() {
        List<ScheduledTaskRecord> activeTasks = scheduledTaskRepository.findAllByEnabledTrue();
        if (activeTasks.isEmpty()) return;

        LocalDateTime now = LocalDateTime.now();
        for (ScheduledTaskRecord task : activeTasks) {
            // If nextRun is null or due, execute
            if (task.getNextRun() == null || task.getNextRun().isBefore(now)) {
                log.info("[CronTriggerService] Firing scheduled task: '{}' (Goal: {})", task.getName(), task.getGoalOrSkillId());
                try {
                    var plan = plannerService.createPlan(task.getGoalOrSkillId());
                    orchestrator.executePlan(plan);
                    task.setLastRun(now);
                    // Schedule next interval (default: 1 hour later)
                    task.setNextRun(now.plusHours(1));
                    scheduledTaskRepository.save(task);
                } catch (Exception e) {
                    log.error("[CronTriggerService] Execution failed for task '{}': {}", task.getName(), e.getMessage());
                }
            }
        }
    }

    public ScheduledTaskRecord registerTask(String name, String cronExpression, String goal) {
        ScheduledTaskRecord record = new ScheduledTaskRecord(
                null,
                name,
                cronExpression,
                goal,
                "{}",
                true,
                null,
                LocalDateTime.now().plusMinutes(5)
        );
        return scheduledTaskRepository.save(record);
    }

    public List<ScheduledTaskRecord> getAllTasks() {
        return scheduledTaskRepository.findAll();
    }
}
