package com.ragnarok.service;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LongTermMemoryService {

    private final VectorStore vectorStore;

    public LongTermMemoryService(VectorStore vectorStore) {
        this.vectorStore = vectorStore;
    }

    public void storeMemory(String memoryText, String category, String sessionId) {
        Document document = new Document(
                memoryText,
                Map.of(
                        "category", category != null ? category : "preference",
                        "sessionId", sessionId != null ? sessionId : "default",
                        "type", "long_term_fact"
                )
        );
        vectorStore.add(List.of(document));
    }

    /**
     * Retrieves closest matching documents from MariaDB Vector store.
     * Uses similarityThresholdAll() to prevent premature cutoff of relevant document chunks.
     */
    public List<Document> searchVectorStore(String userQuery, int topK) {
        SearchRequest searchRequest = SearchRequest.builder()
                .query(userQuery)
                .topK(topK)
                .similarityThresholdAll()
                .build();

        return vectorStore.similaritySearch(searchRequest);
    }

    public List<String> retrieveRelevantMemories(String userQuery, int topK) {
        return searchVectorStore(userQuery, topK).stream()
                .map(Document::getText)
                .collect(Collectors.toList());
    }
}
