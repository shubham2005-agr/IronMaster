package com.ragnarok.sandbox;

import com.ragnarok.skill.SkillResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

/**
 * FR2.3 (Sandboxed / Safe Execution):
 * ProcessBuilderSandboxExecutor enforces directory boundaries (path traversal guards),
 * execution timeouts (30 seconds), and captures stdout/stderr into SkillResult.
 */
@Component
public class ProcessBuilderSandboxExecutor {

    private static final Logger log = LoggerFactory.getLogger(ProcessBuilderSandboxExecutor.class);
    private static final int TIMEOUT_SECONDS = 30;

    private final Path workspaceRoot;

    public ProcessBuilderSandboxExecutor(
            @Value("${ragnarok.workspace.root:.}") String workspacePath) {
        this.workspaceRoot = Paths.get(workspacePath).toAbsolutePath().normalize();
        log.info("[SandboxExecutor] Workspace boundary locked to: {}", this.workspaceRoot);
    }

    public Path getWorkspaceRoot() {
        return workspaceRoot;
    }

    /**
     * Guard against path traversal attacks (e.g., ../ or outside absolute paths).
     */
    public Path validateAndResolvePath(String relativeOrSubPath) {
        if (relativeOrSubPath == null || relativeOrSubPath.isBlank()) {
            throw new IllegalArgumentException("Target path cannot be empty.");
        }
        Path resolved = workspaceRoot.resolve(relativeOrSubPath).normalize();
        if (!resolved.startsWith(workspaceRoot)) {
            throw new SecurityException("Sandbox Violation: Access outside workspace root is forbidden: " + relativeOrSubPath);
        }
        return resolved;
    }

    /**
     * Executes an approved shell command or script inside the bounded workspace.
     */
    public SkillResult executeCommand(String command) {
        if (command == null || command.isBlank()) {
            return SkillResult.failure("Command cannot be empty");
        }

        log.info("[SandboxExecutor] Executing command with {}s timeout: {}", TIMEOUT_SECONDS, command);

        try {
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");
            ProcessBuilder processBuilder;

            if (isWindows) {
                processBuilder = new ProcessBuilder("powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command);
            } else {
                processBuilder = new ProcessBuilder("bash", "-c", command);
            }

            processBuilder.directory(workspaceRoot.toFile());

            Process process = processBuilder.start();

            StringBuilder stdout = new StringBuilder();
            StringBuilder stderr = new StringBuilder();

            Thread outThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        stdout.append(line).append("\n");
                    }
                } catch (Exception ignored) {}
            });

            Thread errThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        stderr.append(line).append("\n");
                    }
                } catch (Exception ignored) {}
            });

            outThread.start();
            errThread.start();

            boolean finishedInTime = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);

            if (!finishedInTime) {
                process.destroyForcibly();
                return SkillResult.failure("Execution timed out after " + TIMEOUT_SECONDS + " seconds.");
            }

            outThread.join(2000);
            errThread.join(2000);

            int exitCode = process.exitValue();
            if (exitCode == 0) {
                return SkillResult.success(stdout.toString().trim());
            } else {
                String errMsg = stderr.toString().trim();
                if (errMsg.isEmpty()) errMsg = stdout.toString().trim();
                return SkillResult.failure("Process exited with code " + exitCode + ": " + errMsg);
            }
        } catch (Exception e) {
            log.error("[SandboxExecutor] Execution failed: {}", e.getMessage(), e);
            return SkillResult.failure("Execution exception: " + e.getMessage());
        }
    }
}
