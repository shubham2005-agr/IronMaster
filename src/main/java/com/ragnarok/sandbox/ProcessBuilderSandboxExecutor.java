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
     * Guard against path traversal attacks (e.g., ../ or outside absolute paths)
     * and handle cross-platform path formatting (leading slashes, quotes, absolute workspace paths).
     */
    public Path validateAndResolvePath(String relativeOrSubPath) {
        if (relativeOrSubPath == null || relativeOrSubPath.isBlank()) {
            throw new IllegalArgumentException("Target path cannot be empty.");
        }

        // 1. Sanitize enclosing quotes and trim
        String cleanPath = relativeOrSubPath.trim();
        if ((cleanPath.startsWith("\"") && cleanPath.endsWith("\"")) ||
            (cleanPath.startsWith("'") && cleanPath.endsWith("'"))) {
            if (cleanPath.length() >= 2) {
                cleanPath = cleanPath.substring(1, cleanPath.length() - 1).trim();
            }
        }

        // 2. On Windows, if path starts with "/" or "\" without drive prefix (e.g. "/sample_notes.txt"),
        // strip leading slashes so it is treated as relative to workspaceRoot rather than drive root (E:\).
        if (cleanPath.startsWith("/") || cleanPath.startsWith("\\")) {
            if (!cleanPath.matches("^[a-zA-Z]:.*")) {
                cleanPath = cleanPath.replaceFirst("^[\\\\/]+", "");
            }
        }

        Path target = Paths.get(cleanPath);
        Path resolved;
        if (target.isAbsolute()) {
            resolved = target.normalize();
        } else {
            resolved = workspaceRoot.resolve(target).normalize();
        }

        if (!resolved.startsWith(workspaceRoot)) {
            // Secondary fallback: check if file with matching filename exists in workspace root directly
            if (target.getFileName() != null) {
                Path fileOnly = workspaceRoot.resolve(target.getFileName()).normalize();
                if (fileOnly.startsWith(workspaceRoot) && java.nio.file.Files.exists(fileOnly)) {
                    log.info("[SandboxExecutor] Remapped out-of-bounds path '{}' to safe workspace file: {}", relativeOrSubPath, fileOnly);
                    return fileOnly;
                }
            }
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

        String sanitizedCmd = sanitizeCommand(command.trim());
        log.info("[SandboxExecutor] Executing command with {}s timeout: {}", TIMEOUT_SECONDS, sanitizedCmd);

        try {
            boolean isWindows = System.getProperty("os.name").toLowerCase().contains("win");
            ProcessBuilder processBuilder;

            if (isWindows) {
                // Prepend compatibility helper functions for standard Unix idioms on PowerShell
                String preamble = """
                    function grep {
                        param([Parameter(ValueFromPipeline=$true)]$InputObject, [string]$Pattern, [string]$Path)
                        if ($Path) {
                            Get-Content -Path $Path | Select-String -Pattern $Pattern
                        } elseif ($InputObject) {
                            $InputObject | Select-String -Pattern $Pattern
                        } else {
                            $args | Select-String
                        }
                    };
                    function touch {
                        param([string]$Path)
                        if (-not (Test-Path $Path)) {
                            New-Item -ItemType File -Force -Path $Path | Out-Null
                        } else {
                            (Get-Item $Path).LastWriteTime = Get-Date
                        }
                    };
                    function which {
                        param([string]$c)
                        (Get-Command $c -ErrorAction SilentlyContinue).Source
                    };
                    """;
                String fullCommand = preamble + " " + sanitizedCmd;
                processBuilder = new ProcessBuilder("powershell.exe", "-NoProfile", "-NonInteractive", "-Command", fullCommand);
            } else {
                processBuilder = new ProcessBuilder("bash", "-c", sanitizedCmd);
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

    private String sanitizeCommand(String cmd) {
        if (cmd == null) return "";
        String s = cmd.trim();
        // Convert common Linux flags that fail on PowerShell
        s = s.replaceAll("^ls\\s+-[a-zA-Z]*l[a-zA-Z]*", "Get-ChildItem -Force");
        s = s.replaceAll("^rm\\s+-rf\\s+", "Remove-Item -Recurse -Force ");
        return s;
    }
}
