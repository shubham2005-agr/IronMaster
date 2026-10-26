package com.ragnarok.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ragnarok.entity.SuggestionCard;
import com.ragnarok.repository.SuggestionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * FR4.2 (Contextual Proactivity - ProactiveAgentService):
 * Periodically sweeps semantic memory for actionable commitments, deadlines, or pending tasks,
 * generating SuggestionCards for the user.
 */
@Service
public class ProactiveAgentService {

    private static final Logger log = LoggerFactory.getLogger(ProactiveAgentService.class);

    private final SemanticMemoryService semanticMemoryService;
    private final SuggestionRepository suggestionRepository;
    private final ChatClient chatClient;
    private final ObjectMapper objectMapper;

    public ProactiveAgentService(
            SemanticMemoryService semanticMemoryService,
            SuggestionRepository suggestionRepository,
            ChatClient chatClient) {
        this.semanticMemoryService = semanticMemoryService;
        this.suggestionRepository = suggestionRepository;
        this.chatClient = chatClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Periodic sweep runs every hour with an initial delay of 1 hour so local Ollama CPU is never blocked during active user sessions.
     * Can always be triggered immediately on-demand via the UI 'Trigger Sweep' button.
     */
    @Scheduled(fixedRate = 3600000, initialDelay = 3600000)
    public void scheduledProactiveSweep() {
        log.info("[ProactiveAgent] Initiating scheduled proactive contextual sweep...");
        runProactiveSweep();
    }

    @Transactional
    public List<SuggestionCard> runProactiveSweep() {
        // Query semantic memory for commitments, deadlines, pending goals
        List<Document> memoryDocs = semanticMemoryService.similaritySearch("deadline task commitment project priority milestone", 5);

        if (memoryDocs.isEmpty()) {
            log.info("[ProactiveAgent] No actionable commitments discovered in semantic memory.");
            return Collections.emptyList();
        }

        StringBuilder memoryContext = new StringBuilder();
        for (Document doc : memoryDocs) {
            memoryContext.append("- ").append(doc.getText()).append("\n");
        }

        String prompt = """
                You are Ragnarok's Proactive Intelligence Agent.
                Analyze the following retrieved long-term memories regarding user projects, commitments, and goals.
                Identify if there are any pending tasks, upcoming deadlines, or actionable initiatives that would benefit the user.
                
                Retrieved Context:
                %s
                
                Generate up to 2 proactive suggestions formatted as a JSON array of objects with fields:
                - "title": Short catchy title (e.g. "Draft Project Briefing")
                - "description": Contextual explanation of why this is suggested (e.g. "Your hackathon submission deadline is approaching. Would you like me to prepare the final architecture summary?")
                - "actionType": "WORKFLOW" or "CHAT_PROMPT"
                - "actionPayload": Concrete action prompt to run
                
                Return ONLY valid JSON array. If no suggestions are justified, return [].
                """.formatted(memoryContext.toString());

        List<SuggestionCard> createdCards = new ArrayList<>();
        try {
            String rawJson = chatClient.prompt().user(prompt).call().content();
            String clean = extractJsonArray(rawJson);
            List<Map<String, String>> parsed = objectMapper.readValue(clean, new TypeReference<>() {});

            for (Map<String, String> item : parsed) {
                String title = item.get("title");
                String description = item.get("description");
                String actionType = item.getOrDefault("actionType", "CHAT_PROMPT");
                String payload = item.getOrDefault("actionPayload", title);

                if (title != null && description != null) {
                    SuggestionCard card = new SuggestionCard(
                            null,
                            title,
                            description,
                            actionType,
                            payload,
                            "PENDING",
                            LocalDateTime.now()
                    );
                    createdCards.add(suggestionRepository.save(card));
                }
            }
            log.info("[ProactiveAgent] Generated {} new proactive suggestion cards.", createdCards.size());
        } catch (Exception e) {
            log.warn("[ProactiveAgent] Proactive sweep parsing error: {}", e.getMessage());
        }

        return createdCards;
    }

    public List<SuggestionCard> getPendingSuggestions() {
        return suggestionRepository.findAllByStatusOrderByCreatedAtDesc("PENDING");
    }

    @Transactional
    public void dismissSuggestion(Long id) {
        suggestionRepository.findById(id).ifPresent(card -> {
            card.setStatus("DISMISSED");
            suggestionRepository.save(card);
        });
    }

    @Transactional
    public void acceptSuggestion(Long id) {
        suggestionRepository.findById(id).ifPresent(card -> {
            card.setStatus("ACCEPTED");
            suggestionRepository.save(card);
        });
    }

    private String extractJsonArray(String raw) {
        if (raw == null) return "[]";
        String clean = raw.trim();
        int start = clean.indexOf('[');
        int end = clean.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            return clean.substring(start, end + 1);
        }
        return "[]";
    }
}
