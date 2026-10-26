package com.ragnarok.service;

import com.ragnarok.entity.ChatMessageRecord;
import com.ragnarok.entity.ConversationSession;
import com.ragnarok.repository.ChatMessageRecordRepository;
import com.ragnarok.repository.ConversationSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class ShortTermMemoryService {

    private final ChatMessageRecordRepository chatMessageRepository;
    private final ConversationSessionRepository sessionRepository;

    public ShortTermMemoryService(
            ChatMessageRecordRepository chatMessageRepository,
            ConversationSessionRepository sessionRepository) {
        this.chatMessageRepository = chatMessageRepository;
        this.sessionRepository = sessionRepository;
    }

    @Transactional
    public void saveMessage(String sessionId, String role, String content) {
        LocalDateTime now = LocalDateTime.now();

        // Ensure session tracking record exists and update its title/timestamp
        sessionRepository.findBySessionId(sessionId).ifPresentOrElse(
                session -> {
                    session.setUpdatedAt(now);
                    // If title is default or placeholder, update it with first user message
                    if ("USER".equalsIgnoreCase(role)) {
                        String currentTitle = session.getTitle();
                        if (currentTitle == null || currentTitle.startsWith("Session ") || currentTitle.equalsIgnoreCase("New Chat")) {
                            session.setTitle(generateTitleFromContent(content));
                        }
                    }
                    sessionRepository.save(session);
                },
                () -> {
                    String title = "USER".equalsIgnoreCase(role) ? generateTitleFromContent(content) : "New Chat";
                    sessionRepository.save(ConversationSession.builder()
                            .sessionId(sessionId)
                            .title(title)
                            .createdAt(now)
                            .updatedAt(now)
                            .build());
                }
        );

        chatMessageRepository.save(ChatMessageRecord.builder()
                .sessionId(sessionId)
                .role(role)
                .content(content)
                .timestamp(now)
                .build());
    }

    private String generateTitleFromContent(String content) {
        if (content == null || content.isBlank()) return "New Chat";
        String clean = content.replaceAll("[\\r\\n]+", " ").trim();
        return clean.length() > 36 ? clean.substring(0, 36) + "..." : clean;
    }

    public List<ChatMessageRecord> getRecentContext(String sessionId) {
        List<ChatMessageRecord> latestRecords = new ArrayList<>(
                chatMessageRepository.findTop10BySessionIdOrderByTimestampDesc(sessionId)
        );
        if (latestRecords.size() > 6) {
            latestRecords = new ArrayList<>(latestRecords.subList(0, 6));
        }
        Collections.reverse(latestRecords);
        return latestRecords;
    }

    public List<ChatMessageRecord> getAllMessages(String sessionId) {
        return chatMessageRepository.findAllBySessionIdOrderByTimestampAsc(sessionId);
    }

    public List<ConversationSession> getAllSessions() {
        return sessionRepository.findAllByOrderByUpdatedAtDesc();
    }

    @Transactional
    public ConversationSession createSession(String sessionId, String title) {
        LocalDateTime now = LocalDateTime.now();
        String actualId = (sessionId != null && !sessionId.isBlank()) 
                ? sessionId 
                : "session-" + UUID.randomUUID().toString().substring(0, 8);
        String actualTitle = (title != null && !title.isBlank()) ? title : "New Chat";

        ConversationSession session = ConversationSession.builder()
                .sessionId(actualId)
                .title(actualTitle)
                .createdAt(now)
                .updatedAt(now)
                .build();
        return sessionRepository.save(session);
    }

    @Transactional
    public void updateSessionTitle(String sessionId, String title) {
        sessionRepository.findBySessionId(sessionId).ifPresent(s -> {
            s.setTitle(title);
            s.setUpdatedAt(LocalDateTime.now());
            sessionRepository.save(s);
        });
    }

    @Transactional
    public void clear(String sessionId) {
        chatMessageRepository.deleteBySessionId(sessionId);
        sessionRepository.deleteBySessionId(sessionId);
    }

    @Transactional
    public void clearMessages(String sessionId) {
        chatMessageRepository.deleteBySessionId(sessionId);
    }
}
