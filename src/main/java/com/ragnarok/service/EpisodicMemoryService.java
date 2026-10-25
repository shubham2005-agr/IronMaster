package com.ragnarok.service;

import com.ragnarok.entity.ChatMessageRecord;
import com.ragnarok.repository.ChatMessageRecordRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * FR1.1 (Episodic Memory - Muninn's Saga-Log):
 * Logs every interaction turn in MySQL and provides chronological queries and keyword search.
 */
@Service
public class EpisodicMemoryService {

    private final ChatMessageRecordRepository chatMessageRepository;

    public EpisodicMemoryService(ChatMessageRecordRepository chatMessageRepository) {
        this.chatMessageRepository = chatMessageRepository;
    }

    @Transactional
    public ChatMessageRecord logInteraction(String conversationId, String role, String content, String status, String metadata) {
        ChatMessageRecord record = ChatMessageRecord.builder()
                .sessionId(conversationId)
                .role(role)
                .content(content)
                .status(status != null ? status : "SUCCESS")
                .metadata(metadata)
                .timestamp(LocalDateTime.now())
                .build();
        return chatMessageRepository.save(record);
    }

    public List<ChatMessageRecord> getRecentHistory(String conversationId, int limit) {
        List<ChatMessageRecord> records = chatMessageRepository.findRecentBySessionId(
                conversationId, PageRequest.of(0, Math.max(1, limit))
        );
        Collections.reverse(records); // Return chronological order
        return records;
    }

    public List<ChatMessageRecord> searchInteractions(String query) {
        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }
        return chatMessageRepository.searchByContent(query.trim());
    }
}
