package com.ragnarok.controller;

import com.ragnarok.entity.SuggestionCard;
import com.ragnarok.service.ProactiveAgentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ProactiveController {

    private final ProactiveAgentService proactiveAgentService;

    public ProactiveController(ProactiveAgentService proactiveAgentService) {
        this.proactiveAgentService = proactiveAgentService;
    }

    @GetMapping("/suggestions")
    public ResponseEntity<List<SuggestionCard>> getSuggestions() {
        return ResponseEntity.ok(proactiveAgentService.getPendingSuggestions());
    }

    @PostMapping("/suggestions/{id}/dismiss")
    public ResponseEntity<Map<String, String>> dismissSuggestion(@PathVariable Long id) {
        proactiveAgentService.dismissSuggestion(id);
        return ResponseEntity.ok(Map.of("status", "Suggestion dismissed"));
    }

    @PostMapping("/suggestions/{id}/accept")
    public ResponseEntity<Map<String, String>> acceptSuggestion(@PathVariable Long id) {
        proactiveAgentService.acceptSuggestion(id);
        return ResponseEntity.ok(Map.of("status", "Suggestion accepted"));
    }

    @PostMapping("/agent/sweep")
    public ResponseEntity<List<SuggestionCard>> triggerSweep() {
        return ResponseEntity.ok(proactiveAgentService.runProactiveSweep());
    }
}
