package com.ragnarok.service;

import com.ragnarok.entity.ChatMessageRecord;
import com.ragnarok.repository.ChatMessageRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * FR1.3 (Memory Consolidation & Forgetting - The Norns):
 * Extracts permanent facts/preferences from episodic chat logs via llama3.2 into MariaDB Vector,
 * and prunes aged episodic chat logs (>30 days).
 */
@Service
public class MemoryConsolidationService {

    private static final Logger log = LoggerFactory.getLogger(MemoryConsolidationService.class);

    private final ChatMessageRecordRepository chatMessageRepository;
    private final SemanticMemoryService semanticMemoryService;
    private final ChatClient chatClient;

    public MemoryConsolidationService(
            ChatMessageRecordRepository chatMessageRepository,
            SemanticMemoryService semanticMemoryService,
            ChatClient chatClient) {
        this.chatMessageRepository = chatMessageRepository;
        this.semanticMemoryService = semanticMemoryService;
        this.chatClient = chatClient;
    }

    /**
     * Nightly scheduled consolidation job at 02:00 AM.
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void scheduledConsolidation() {
        log.info("[MemoryConsolidation] Running scheduled nightly consolidation...");
        consolidateMemories();
        pruneOldMemories(30);
    }

    /**
     * Consolidates episodic memories into semantic facts and preferences.
     */
    @Transactional
    public Map<String, Object> consolidateMemories() {
        log.info("[MemoryConsolidation] Beginning memory consolidation sweep...");

        // Retrieve recent user messages from the last 7 days (or last 50 interactions)
        LocalDateTime since = LocalDateTime.now().minusDays(7);
        List<ChatMessageRecord> recentMessages = chatMessageRepository.findByTimestampAfterOrderByTimestampAsc(since);

        if (recentMessages.isEmpty()) {
            return Map.of("status", "No recent interactions found for consolidation", "extractedFactsCount", 0);
        }

        StringBuilder interactionTranscript = new StringBuilder();
        for (ChatMessageRecord msg : recentMessages) {
            interactionTranscript.append(msg.getRole()).append(": ").append(msg.getContent()).append("\n");
        }

        String prompt = """
                Analyze the following recent conversation transcript between a user and an AI assistant.
                Identify and extract:
                1. Core user preferences (formatting rules, favorite languages, response styles, tone).
                2. Permanent personal facts (name, role, project details, deadlines, technologies used).
                
                Format rules:
                - Output each fact or preference as a single line prefixed with either "PREFERENCE: " or "FACT: ".
                - Be concise and actionable.
                - If no permanent facts or preferences exist, output "NONE".
                - Do not include conversational greetings or transient context.
                
                Transcript:
                %s
                """.formatted(interactionTranscript.toString());

        try {
            String aiResult = chatClient.prompt()
                    .user(prompt)
                    .call()
                    .content();

            List<String> storedItems = new ArrayList<>();
            if (aiResult != null && !aiResult.contains("NONE")) {
                String[] lines = aiResult.split("\\r?\\n");
                for (String line : lines) {
                    String clean = line.trim();
                    if (clean.startsWith("- ")) clean = clean.substring(2).trim();

                    if (clean.startsWith("PREFERENCE:")) {
                        String pref = clean.substring("PREFERENCE:".length()).trim();
                        if (!pref.isBlank()) {
                            semanticMemoryService.storeUserPreference(pref, "consolidated_preference");
                            storedItems.add("Preference: " + pref);
                        }
                    } else if (clean.startsWith("FACT:")) {
                        String fact = clean.substring("FACT:".length()).trim();
                        if (!fact.isBlank()) {
                            semanticMemoryService.storeUserFact(fact, "consolidated_fact");
                            storedItems.add("Fact: " + fact);
                        }
                    }
                }
            }

            log.info("[MemoryConsolidation] Consolidated {} memory items into vector store.", storedItems.size());
            return Map.of(
                    "status", "Consolidation complete",
                    "extractedFactsCount", storedItems.size(),
                    "items", storedItems
            );
        } catch (Exception e) {
            log.error("[MemoryConsolidation] Error during consolidation: {}", e.getMessage(), e);
            return Map.of("status", "Error", "message", e.getMessage());
        }
    }

    /**
     * Deletes short-term chat logs older than specified days (default 30 days).
     */
    @Transactional
    public Map<String, Object> pruneOldMemories(int days) {
        int safeDays = days > 0 ? days : 30;
        LocalDateTime cutoff = LocalDateTime.now().minusDays(safeDays);
        log.info("[MemoryConsolidation] Pruning episodic records before {}", cutoff);

        chatMessageRepository.deleteByTimestampBefore(cutoff);

        return Map.of(
                "status", "Pruned episodic messages older than " + safeDays + " days",
                "cutoffTimestamp", cutoff.toString()
        );
    }
}
