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
 * FR3.2 Built-in Skill: FileWriteSkill
 * Writes or previews file changes safely inside the bounded workspace.
 */
@Component
public class FileWriteSkill implements AgentSkill {

    private final ProcessBuilderSandboxExecutor sandboxExecutor;

    public FileWriteSkill(ProcessBuilderSandboxExecutor sandboxExecutor) {
        this.sandboxExecutor = sandboxExecutor;
    }

    @Override
    public String getId() {
        return "file_write";
    }

    @Override
    public String getName() {
        return "Write Workspace File";
    }

    @Override
    public String getDescription() {
        return "Writes content or generates a new file safely inside the workspace boundary.";
    }

    @Override
    public Map<String, Object> getInputSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "filePath", Map.of(
                                "type", "string",
                                "description", "Relative path to target file in workspace"
                        ),
                        "content", Map.of(
                                "type", "string",
                                "description", "Text or code content to write"
                        )
                ),
                "required", java.util.List.of("filePath", "content")
        );
    }

    @Override
    public SkillResult execute(Map<String, Object> params) {
        try {
            String filePath = (String) params.get("filePath");
            String content = (String) params.get("content");

            if (filePath == null || filePath.isBlank()) {
                return SkillResult.failure("Parameter 'filePath' is required.");
            }
            if (content == null) {
                return SkillResult.failure("Parameter 'content' cannot be null.");
            }

            Path path = sandboxExecutor.validateAndResolvePath(filePath);
            if (path.getParent() != null) {
                Files.createDirectories(path.getParent());
            }

            Files.writeString(path, content, StandardCharsets.UTF_8);
            return SkillResult.success("File written successfully: " + filePath + " (" + content.length() + " chars)");
        } catch (Exception e) {
            return SkillResult.failure("Failed to write file: " + e.getMessage());
        }
    }
}
