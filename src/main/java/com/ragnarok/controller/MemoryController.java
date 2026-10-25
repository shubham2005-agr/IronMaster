package com.ragnarok.controller;

import com.ragnarok.dto.MemoryItemDto;
import com.ragnarok.entity.ChatMessageRecord;
import com.ragnarok.service.EpisodicMemoryService;
import com.ragnarok.service.LongTermMemoryService;
import com.ragnarok.service.MemoryConsolidationService;
import com.ragnarok.service.ShortTermMemoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/memory")
public class MemoryController {

    private final LongTermMemoryService longTermMemory;
    private final ShortTermMemoryService shortTermMemory;
    private final EpisodicMemoryService episodicMemory;
    private final MemoryConsolidationService consolidationService;

    public MemoryController(
            LongTermMemoryService longTermMemory,
            ShortTermMemoryService shortTermMemory,
            EpisodicMemoryService episodicMemory,
            MemoryConsolidationService consolidationService) {
        this.longTermMemory = longTermMemory;
        this.shortTermMemory = shortTermMemory;
        this.episodicMemory = episodicMemory;
        this.consolidationService = consolidationService;
    }

    @PostMapping("/remember")
    public ResponseEntity<Map<String, String>> addLongTermMemory(@RequestBody MemoryItemDto dto) {
        longTermMemory.storeMemory(dto.getText(), dto.getCategory(), dto.getSessionId());
        return ResponseEntity.ok(Map.of("status", "Remembered into MariaDB Vector successfully"));
    }

    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<Map<String, String>> clearSession(@PathVariable String sessionId) {
        shortTermMemory.clear(sessionId);
        return ResponseEntity.ok(Map.of("status", "Short-term session memory cleared"));
    }

    @GetMapping("/session/{sessionId}")
    public ResponseEntity<List<ChatMessageRecord>> getSessionMessages(@PathVariable String sessionId) {
        return ResponseEntity.ok(shortTermMemory.getAllMessages(sessionId));
    }

    // FR1.1 Episodic search endpoint
    @GetMapping("/episodic")
    public ResponseEntity<List<ChatMessageRecord>> searchEpisodic(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "conversationId", required = false) String conversationId,
            @RequestParam(value = "limit", defaultValue = "20") int limit) {
        if (conversationId != null && !conversationId.isBlank()) {
            return ResponseEntity.ok(episodicMemory.getRecentHistory(conversationId, limit));
        }
        return ResponseEntity.ok(episodicMemory.searchInteractions(query));
    }

    // FR1.3 Memory Consolidation endpoint
    @PostMapping("/consolidate")
    public ResponseEntity<Map<String, Object>> consolidateMemories() {
        return ResponseEntity.ok(consolidationService.consolidateMemories());
    }

    // FR1.3 Memory Pruning endpoint
    @RequestMapping(value = "/prune", method = {RequestMethod.POST, RequestMethod.DELETE})
    public ResponseEntity<Map<String, Object>> pruneMemories(@RequestParam(value = "days", defaultValue = "30") int days) {
        return ResponseEntity.ok(consolidationService.pruneOldMemories(days));
    }
}
