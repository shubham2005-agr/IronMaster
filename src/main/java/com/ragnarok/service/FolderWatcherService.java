package com.ragnarok.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Map;

/**
 * FR4.1 (Always-On Background Processing):
 * FolderWatcherService uses Java NIO WatchService on a daemon thread to monitor an approved folder.
 * When a new .txt or .md file is dropped or modified, automatically ingests it into SemanticMemoryService.
 */
@Service
public class FolderWatcherService {

    private static final Logger log = LoggerFactory.getLogger(FolderWatcherService.class);

    private final SemanticMemoryService semanticMemoryService;
    private final Path watchDir;
    private volatile boolean running = true;
    private WatchService watchService;
    private Thread watcherThread;

    public FolderWatcherService(
            SemanticMemoryService semanticMemoryService,
            @Value("${ragnarok.watch.folder:./watch_folder}") String watchFolderPath) {
        this.semanticMemoryService = semanticMemoryService;
        this.watchDir = Paths.get(watchFolderPath).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            if (!Files.exists(watchDir)) {
                Files.createDirectories(watchDir);
                log.info("[FolderWatcher] Created watch directory: {}", watchDir);
            }
            this.watchService = FileSystems.getDefault().newWatchService();
            watchDir.register(watchService, StandardWatchEventKinds.ENTRY_CREATE, StandardWatchEventKinds.ENTRY_MODIFY);
            log.info("[FolderWatcher] Registered NIO WatchService on: {}", watchDir);

            // Start dedicated daemon listener thread
            this.watcherThread = new Thread(this::watchLoop, "FolderWatcher-Daemon");
            this.watcherThread.setDaemon(true);
            this.watcherThread.start();
            log.info("[FolderWatcher] Daemon thread started successfully.");
        } catch (IOException e) {
            log.error("[FolderWatcher] Failed to initialize WatchService: {}", e.getMessage());
        }
    }

    private void watchLoop() {
        while (running) {
            try {
                WatchKey key = watchService.take(); // Blocks daemon thread until event
                for (WatchEvent<?> event : key.pollEvents()) {
                    WatchEvent.Kind<?> kind = event.kind();
                    if (kind == StandardWatchEventKinds.OVERFLOW) continue;

                    Path filename = (Path) event.context();
                    Path fullPath = watchDir.resolve(filename);
                    String nameStr = filename.toString().toLowerCase();

                    if (nameStr.endsWith(".txt") || nameStr.endsWith(".md")) {
                        log.info("[FolderWatcher] Detected file event: {}. Reading and ingesting...", filename);
                        Thread.sleep(600); // Wait for file flush
                        if (Files.exists(fullPath)) {
                            String content = Files.readString(fullPath, StandardCharsets.UTF_8);
                            semanticMemoryService.ingestChunk(
                                    content,
                                    SemanticMemoryService.MemoryType.DOCUMENT,
                                    Map.of(
                                            "source", filename.toString(),
                                            "origin", "watch_folder",
                                            "category", "continuous_ingestion"
                                    )
                            );
                            log.info("[FolderWatcher] Successfully ingested {} ({} chars)", filename, content.length());
                        }
                    }
                }
                boolean valid = key.reset();
                if (!valid) {
                    log.warn("[FolderWatcher] WatchKey no longer valid, exiting daemon loop.");
                    break;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("[FolderWatcher] Error in watchLoop: {}", e.getMessage());
            }
        }
    }

    @PreDestroy
    public void stop() {
        running = false;
        if (watcherThread != null) {
            watcherThread.interrupt();
        }
        if (watchService != null) {
            try {
                watchService.close();
            } catch (IOException ignored) {}
        }
    }
}
