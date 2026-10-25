package com.ragnarok.controller;

import com.ragnarok.entity.ChatMessageRecord;
import com.ragnarok.entity.ConversationSession;
import com.ragnarok.service.ShortTermMemoryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final ShortTermMemoryService shortTermMemory;

    public SessionController(ShortTermMemoryService shortTermMemory) {
        this.shortTermMemory = shortTermMemory;
    }

    @GetMapping
    public ResponseEntity<List<ConversationSession>> getSessions() {
        return ResponseEntity.ok(shortTermMemory.getAllSessions());
    }

    @PostMapping
    public ResponseEntity<ConversationSession> createSession(
            @RequestBody(required = false) Map<String, String> body) {
        String sessionId = body != null ? body.get("sessionId") : null;
        String title = body != null ? body.get("title") : null;
        return ResponseEntity.ok(shortTermMemory.createSession(sessionId, title));
    }

    @PutMapping("/{sessionId}/title")
    public ResponseEntity<Map<String, String>> updateTitle(
            @PathVariable String sessionId,
            @RequestBody Map<String, String> body) {
        String title = body.get("title");
        if (title != null && !title.isBlank()) {
            shortTermMemory.updateSessionTitle(sessionId, title);
        }
        return ResponseEntity.ok(Map.of("status", "Session title updated"));
    }

    @GetMapping("/{sessionId}/messages")
    public ResponseEntity<List<ChatMessageRecord>> getSessionMessages(@PathVariable String sessionId) {
        return ResponseEntity.ok(shortTermMemory.getAllMessages(sessionId));
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Map<String, String>> deleteSession(@PathVariable String sessionId) {
        shortTermMemory.clear(sessionId);
        return ResponseEntity.ok(Map.of("status", "Session deleted successfully"));
    }

    @DeleteMapping("/{sessionId}/messages")
    public ResponseEntity<Map<String, String>> clearMessages(@PathVariable String sessionId) {
        shortTermMemory.clearMessages(sessionId);
        return ResponseEntity.ok(Map.of("status", "Messages cleared successfully"));
    }
}
