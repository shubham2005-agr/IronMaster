package com.ragnarok.skill.builtin;

import com.ragnarok.service.SemanticMemoryService;
import com.ragnarok.skill.AgentSkill;
import com.ragnarok.skill.SkillResult;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Built-in Skill: KnowledgeSearchSkill (knowledge_search)
 * Queries MariaDB Vector store for semantic knowledge snippets and document contexts.
 */
@Component
public class KnowledgeSearchSkill implements AgentSkill {

    private final SemanticMemoryService semanticMemoryService;

    public KnowledgeSearchSkill(SemanticMemoryService semanticMemoryService) {
        this.semanticMemoryService = semanticMemoryService;
    }

    @Override
    public String getId() {
        return "knowledge_search";
    }

    @Override
    public String getName() {
        return "Search Vector Knowledge Store";
    }

    @Override
    public String getDescription() {
        return "Performs semantic similarity retrieval against uploaded documents, facts, and permanent memory.";
    }

    @Override
    public Map<String, Object> getInputSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "query", Map.of("type", "string", "description", "Semantic query or concept to search"),
                        "topK", Map.of("type", "integer", "description", "Number of matching documents to retrieve (default: 4)")
                ),
                "required", List.of("query")
        );
    }

    @Override
    public SkillResult execute(Map<String, Object> params) {
        try {
            String query = com.ragnarok.skill.SkillParamUtils.extractString(params, "query", "prompt", "search", "q", "text", "concept");
            if (query == null || query.isBlank()) {
                return SkillResult.failure("Parameter 'query' is required.");
            }

            int topK = com.ragnarok.skill.SkillParamUtils.extractInteger(params, 4, "topK", "top_k", "limit", "count");

            List<Document> docs = semanticMemoryService.similaritySearch(query, topK);
            if (docs.isEmpty()) {
                return SkillResult.success("No matching knowledge documents found in vector store.");
            }

            String formatted = docs.stream()
                    .map(d -> {
                        Object source = d.getMetadata() != null ? d.getMetadata().get("source") : "general";
                        return "[" + source + "]\n" + d.getText();
                    })
                    .collect(Collectors.joining("\n\n---\n\n"));

            return SkillResult.success(formatted);
        } catch (Exception e) {
            return SkillResult.failure("Failed to search knowledge store: " + e.getMessage());
        }
    }
}
