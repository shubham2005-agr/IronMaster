package com.ragnarok.skill.builtin;

import com.ragnarok.sandbox.ProcessBuilderSandboxExecutor;
import com.ragnarok.skill.AgentSkill;
import com.ragnarok.skill.SkillResult;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * FR3.2 Built-in Skill: ShellCommandSkill
 * Triggers approved local shell actions through ProcessBuilderSandboxExecutor.
 */
@Component
public class ShellCommandSkill implements AgentSkill {

    private final ProcessBuilderSandboxExecutor sandboxExecutor;

    public ShellCommandSkill(ProcessBuilderSandboxExecutor sandboxExecutor) {
        this.sandboxExecutor = sandboxExecutor;
    }

    @Override
    public String getId() {
        return "shell_command";
    }

    @Override
    public String getName() {
        return "Execute Sandboxed Shell Command";
    }

    @Override
    public String getDescription() {
        return "Executes an approved CLI command within the bounded workspace environment with timeout.";
    }

    @Override
    public Map<String, Object> getInputSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "command", Map.of(
                                "type", "string",
                                "description", "Command line string to execute inside workspace"
                        )
                ),
                "required", java.util.List.of("command")
        );
    }

    @Override
    public SkillResult execute(Map<String, Object> params) {
        String command = com.ragnarok.skill.SkillParamUtils.extractString(params, "command", "cmd", "script", "shellCommand", "action");
        if (command == null || command.isBlank()) {
            return SkillResult.failure("Parameter 'command' (or 'cmd') is required.");
        }
        return sandboxExecutor.executeCommand(command);
    }
}
