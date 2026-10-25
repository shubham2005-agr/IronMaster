package com.ragnarok.service;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * FR1.2 (Semantic Memory - Mimir's Well):
 * Integrates with MariaDBVectorStore (Port 3307) for storing and retrieving facts, preferences, and documents.
 */
@Service
public class SemanticMemoryService {

    public enum MemoryType {
        FACT,
        PREFERENCE,
        DOCUMENT
    }

    private final VectorStore vectorStore;

    public SemanticMemoryService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    /**
     * Ingests a text chunk with explicit metadata and type (FACT, PREFERENCE, DOCUMENT).
     */
    public void ingestChunk(String text, MemoryType type, Map<String, Object> extraMetadata) {
        Map<String, Object> metadata = new HashMap<>();
        if (extraMetadata != null) {
            metadata.putAll(extraMetadata);
        }
        metadata.put("type", type.name());
        metadata.put("timestamp", System.currentTimeMillis());

        Document document = new Document(text, metadata);
        vectorStore.add(List.of(document));
    }

    /**
     * Store explicit user fact into semantic memory.
     */
    public void storeUserFact(String fact, String category) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("category", category != null ? category : "general_fact");
        ingestChunk(fact, MemoryType.FACT, meta);
    }

    /**
     * Store explicit user preference into semantic memory.
     */
    public void storeUserPreference(String preference, String category) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("category", category != null ? category : "user_preference");
        ingestChunk(preference, MemoryType.PREFERENCE, meta);
    }

    /**
     * Perform semantic similarity search.
     */
    public List<Document> similaritySearch(String prompt, int topK) {
        SearchRequest searchRequest = SearchRequest.builder()
                .query(prompt)
                .topK(topK)
                .similarityThresholdAll()
                .build();
        return vectorStore.similaritySearch(searchRequest);
    }

    /**
     * Helper to retrieve string list of relevant memories.
     */
    public List<String> retrieveMemoryTexts(String prompt, int topK) {
        return similaritySearch(prompt, topK).stream()
                .map(Document::getText)
                .collect(Collectors.toList());
    }
}
