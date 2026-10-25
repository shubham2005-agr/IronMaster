package com.ragnarok.skill.builtin;

import com.ragnarok.sandbox.ProcessBuilderSandboxExecutor;
import com.ragnarok.skill.AgentSkill;
import com.ragnarok.skill.SkillResult;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Built-in Skill: FileSearchSkill (file_search)
 * Searches for text or regular expression patterns inside a workspace file.
 * Eliminates platform-dependent CLI issues like 'grep' on Windows.
 */
@Component
public class FileSearchSkill implements AgentSkill {

    private final ProcessBuilderSandboxExecutor sandboxExecutor;

    public FileSearchSkill(ProcessBuilderSandboxExecutor sandboxExecutor) {
        this.sandboxExecutor = sandboxExecutor;
    }

    @Override
    public String getId() {
        return "file_search";
    }

    @Override
    public String getName() {
        return "Search File Content";
    }

    @Override
    public String getDescription() {
        return "Searches for matching keywords or regex patterns in a workspace file and returns matching lines.";
    }

    @Override
    public Map<String, Object> getInputSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "filePath", Map.of("type", "string", "description", "Relative path to target file in workspace"),
                        "pattern", Map.of("type", "string", "description", "Text substring or regex pattern to match")
                ),
                "required", List.of("filePath", "pattern")
        );
    }

    @Override
    public SkillResult execute(Map<String, Object> params) {
        try {
            String filePath = (String) params.get("filePath");
            String patternStr = (String) params.get("pattern");

            // If switching from shell_command, auto-extract filePath and pattern from command
            if ((filePath == null || filePath.isBlank()) && params.containsKey("command")) {
                String cmd = params.get("command").toString();
                Matcher fileMatcher = Pattern.compile("([\\w-]+\\.[a-zA-Z0-9]+)").matcher(cmd);
                if (fileMatcher.find()) {
                    filePath = fileMatcher.group(1);
                }
                Matcher patternMatcher = Pattern.compile("-(?:Pattern|e|E)\\s+['\"]?([^'\"\\s]+)['\"]?").matcher(cmd);
                if (patternMatcher.find()) {
                    patternStr = patternMatcher.group(1);
                }
            }

            if (filePath == null || filePath.isBlank()) {
                return SkillResult.failure("Parameter 'filePath' is required.");
            }
            if (patternStr == null || patternStr.isBlank()) {
                patternStr = ".*";
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

            List<String> allLines = Files.readAllLines(path, StandardCharsets.UTF_8);
            Pattern compiledPattern;
            try {
                compiledPattern = Pattern.compile(patternStr, Pattern.CASE_INSENSITIVE);
            } catch (Exception e) {
                // If regex compilation fails, fall back to literal pattern match
                compiledPattern = Pattern.compile(Pattern.quote(patternStr), Pattern.CASE_INSENSITIVE);
            }

            List<String> matchingLines = new ArrayList<>();
            for (int i = 0; i < allLines.size(); i++) {
                String line = allLines.get(i);
                Matcher matcher = compiledPattern.matcher(line);
                if (matcher.find()) {
                    matchingLines.add("Line " + (i + 1) + ": " + line);
                }
            }

            if (matchingLines.isEmpty()) {
                return SkillResult.success("No lines matched pattern: " + patternStr);
            }

            return SkillResult.success(String.join("\n", matchingLines));
        } catch (Exception e) {
            return SkillResult.failure("Failed to search file: " + e.getMessage());
        }
    }
}
