package com.ragnarok.controller;

import com.ragnarok.dto.ChatRequest;
import com.ragnarok.dto.ChatResponse;
import com.ragnarok.service.AgentService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final AgentService agentService;

    public ChatController(AgentService agentService) {
        this.agentService = agentService;
    }

    @PostMapping
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        String answer = agentService.executeUserPrompt(request.getSessionId(), request.getMessage());
        return ResponseEntity.ok(new ChatResponse(request.getSessionId(), answer));
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChatPost(@RequestBody ChatRequest request) {
        return agentService.streamUserPrompt(request.getSessionId(), request.getMessage());
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> streamChatGet(
            @RequestParam("sessionId") String sessionId,
            @RequestParam("message") String message) {
        return agentService.streamUserPrompt(sessionId, message);
    }
}
