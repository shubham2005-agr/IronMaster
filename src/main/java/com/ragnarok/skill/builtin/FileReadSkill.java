package com.ragnarok.skill.builtin;

import com.ragnarok.sandbox.ProcessBuilderSandboxExecutor;
import com.ragnarok.skill.AgentSkill;
import com.ragnarok.skill.SkillResult;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/**
 * FR3.2 Built-in Skill: FileReadSkill
 * Reads UTF-8 files within the bounded workspace.
 */
@Component
public class FileReadSkill implements AgentSkill {

    private final ProcessBuilderSandboxExecutor sandboxExecutor;

    public FileReadSkill(ProcessBuilderSandboxExecutor sandboxExecutor) {
        this.sandboxExecutor = sandboxExecutor;
    }

    @Override
    public String getId() {
        return "file_read";
    }

    @Override
    public String getName() {
        return "Read Workspace File";
    }

    @Override
    public String getDescription() {
        return "Safely reads a UTF-8 text or code file within the workspace boundary.";
    }

    @Override
    public Map<String, Object> getInputSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "filePath", Map.of(
                                "type", "string",
                                "description", "Relative path to the file inside workspace"
                        )
                ),
                "required", java.util.List.of("filePath")
        );
    }

    @Override
    public SkillResult execute(Map<String, Object> params) {
        try {
            String filePath = (String) params.get("filePath");
            if (filePath == null || filePath.isBlank()) {
                return SkillResult.failure("Parameter 'filePath' is required.");
            }

            Path path;
            try {
                path = sandboxExecutor.validateAndResolvePath(filePath);
            } catch (Exception e) {
                String fileName = Path.of(filePath).getFileName().toString();
                path = sandboxExecutor.validateAndResolvePath(fileName);
            }
            if (!Files.exists(path)) {
                return SkillResult.failure("File does not exist: " + filePath);
            }

            String content = Files.readString(path, StandardCharsets.UTF_8);
            return SkillResult.success(content);
        } catch (Exception e) {
            return SkillResult.failure("Failed to read file: " + e.getMessage());
        }
    }
}
