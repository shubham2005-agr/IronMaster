package com.ragnarok.service;

import com.ragnarok.entity.ChatMessageRecord;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AgentService {

    private final ChatClient chatClient;
    private final ShortTermMemoryService shortTermMemory;
    private final LongTermMemoryService longTermMemory;
    private final EpisodicMemoryService episodicMemory;
    private final EmailService emailService;
    private final com.ragnarok.skill.SkillRegistry skillRegistry;

    public AgentService(
            ChatClient chatClient,
            ShortTermMemoryService shortTermMemory,
            LongTermMemoryService longTermMemory,
            EpisodicMemoryService episodicMemory,
            EmailService emailService,
            com.ragnarok.skill.SkillRegistry skillRegistry) {
        this.chatClient = chatClient;
        this.shortTermMemory = shortTermMemory;
        this.longTermMemory = longTermMemory;
        this.episodicMemory = episodicMemory;
        this.emailService = emailService;
        this.skillRegistry = skillRegistry;
    }

    private boolean shouldSearchVectorStore(String prompt) {
        if (prompt == null) return false;
        String clean = prompt.trim().toLowerCase();
        if (clean.length() < 10) return false;
        // Skip slow embedding search for common chit-chat or simple greetings
        return !clean.matches("^(hi|hello|hey|good\\s+(morning|afternoon|evening)|howdy|sup|who are you|what can you do|help|thanks|thank you|ok|okay|yes|no|clear|reset)[!.]*$");
    }

    private String buildSystemPrompt(String sessionId, String prompt) {
        List<String> knowledgeBlocks = new ArrayList<>();
        List<String> memoryFactBlocks = new ArrayList<>();

        // 1. Retrieve items from MariaDB Vector ONLY if prompt is informational
        if (shouldSearchVectorStore(prompt)) {
            try {
                List<Document> matchedDocs = longTermMemory.searchVectorStore(prompt, 2);
                for (Document doc : matchedDocs) {
                    Map<String, Object> meta = doc.getMetadata();
                    String type = meta != null && meta.get("type") != null ? meta.get("type").toString() : "";
                    String source = meta != null && meta.get("source") != null ? meta.get("source").toString() : null;
                    String category = meta != null && meta.get("category") != null ? meta.get("category").toString() : "general";

                    if ("knowledge_doc".equalsIgnoreCase(type) || "DOCUMENT".equalsIgnoreCase(type) || source != null) {
                        knowledgeBlocks.add(String.format("[Doc: %s | %s] %s", 
                                source != null ? source : "Uploaded Document", category, doc.getText()));
                    } else {
                        memoryFactBlocks.add(String.format("[%s] %s", category, doc.getText()));
                    }
                }
            } catch (Exception ignored) {
                // Fail silently so vector search never blocks or delays chat stream
            }
        }

        // 2. Retrieve Short-Term Memory (recent 5 conversation turns for speed)
        List<ChatMessageRecord> history = shortTermMemory.getRecentContext(sessionId);
        String chatHistorySection = history.isEmpty() ? "" : history.stream()
                .skip(Math.max(0, history.size() - 6))
                .map(m -> m.getRole() + ": " + m.getContent())
                .collect(Collectors.joining("\n"));

        // 3. Assemble Ultra-Lean, High-Speed System Prompt (compact token size for fast CPU pre-fill)
        StringBuilder sb = new StringBuilder();
        sb.append("You are Ragnarok, a fast, sovereign AI agent with dual persistent memory and autonomous tools.\n");

        if (!knowledgeBlocks.isEmpty()) {
            sb.append("\n=== KNOWLEDGE CONTEXT ===\n").append(String.join("\n", knowledgeBlocks)).append("\n");
        }
        if (!memoryFactBlocks.isEmpty()) {
            sb.append("\n=== USER MEMORY ===\n- ").append(String.join("\n- ", memoryFactBlocks)).append("\n");
        }
        if (!chatHistorySection.isEmpty()) {
            sb.append("\n=== RECENT CONVERSATION ===\n").append(chatHistorySection).append("\n");
        }

        sb.append(String.format("""
                === INSTRUCTIONS ===
                - Be concise, direct, helpful, and fast. Format responses with clear Markdown.
                - Active SMTP Sender: %s
                - To draft an email, output exact block:
                ```email-draft
                {"to":"recipient@example.com","subject":"Subject","body":"Body"}
                ```
                Followed by: "⚠️ **Confirmation Required**: Should I send this email now?"
                - To execute workspace tools (file_read, file_write, file_search, shell_command, knowledge_search), output:
                ```tool-call
                {"skillId":"file_read","parameters":{"filePath":"..."}}
                ```
                """, emailService.getSenderEmail()));
        return sb.toString();
    }

    private boolean isConfirmationIntent(String text) {
        if (text == null) return false;
        String t = text.trim().toLowerCase();
        return t.matches("^(yes|yeah|yup|sure|send|send it|send email|confirm|go ahead|proceed|approved?|please send it|do it)[!.]*$");
    }

    private boolean isCancellationIntent(String text) {
        if (text == null) return false;
        String t = text.trim().toLowerCase();
        return t.matches("^(no|cancel|stop|don't send|dont send|abort|discard)[!.]*$");
    }

    private String handlePendingDraftAction(String sessionId, String prompt) {
        Optional<com.ragnarok.dto.EmailDraft> pendingOpt = emailService.getLatestPendingDraftForSession(sessionId);
        if (pendingOpt.isEmpty()) return null;

        com.ragnarok.dto.EmailDraft draft = pendingOpt.get();
        if (isConfirmationIntent(prompt)) {
            com.ragnarok.dto.EmailResponse resp = emailService.confirmAndSendDraft(draft.getDraftId());
            if (resp.isSuccess()) {
                return String.format("""
                        ### ✅ Email Dispatched Successfully!
                        - **To**: `%s`
                        - **Subject**: `%s`
                        - **Sender**: `%s`
                        - **Timestamp**: `%s`
                        
                        The email has been delivered to the recipient via Google SMTP servers.
                        """, draft.getTo(), draft.getSubject(), emailService.getSenderEmail(), resp.getTimestamp());
            } else {
                return "❌ **Failed to send email**: " + resp.getMessage();
            }
        } else if (isCancellationIntent(prompt)) {
            emailService.cancelDraft(draft.getDraftId());
            return String.format("### 🚫 Email Cancelled\nThe draft to **%s** has been discarded. No email was sent.", draft.getTo());
        }
        return null;
    }

    private void extractAndStageEmailDraft(String sessionId, String content) {
        if (content == null || !content.contains("```email-draft")) return;
        try {
            int start = content.indexOf("```email-draft");
            int end = content.indexOf("```", start + 14);
            if (start != -1 && end != -1) {
                String jsonStr = content.substring(start + 14, end).trim();
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                Map<String, Object> map = mapper.readValue(jsonStr, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                String to = map.get("to") != null ? map.get("to").toString() : null;
                String subject = map.get("subject") != null ? map.get("subject").toString() : "Notification from Ragnarok Agent";
                String body = map.get("body") != null ? map.get("body").toString() : "";
                if (to != null && emailService.isValidEmail(to)) {
                    emailService.createDraft(sessionId, to, subject, body);
                }
            }
        } catch (Exception ignored) {}
    }

    private String executeToolCallIfPresent(String content) {
        if (content == null || !content.contains("```tool-call")) {
            return null;
        }
        try {
            int start = content.indexOf("```tool-call");
            int end = content.indexOf("```", start + 12);
            if (start != -1 && end != -1) {
                String jsonStr = content.substring(start + 12, end).trim();
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                Map<String, Object> map = mapper.readValue(jsonStr, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
                String skillId = map.get("skillId") != null ? map.get("skillId").toString() : null;
                @SuppressWarnings("unchecked")
                Map<String, Object> params = map.get("parameters") instanceof Map ? (Map<String, Object>) map.get("parameters") : java.util.Collections.emptyMap();
                if (skillId != null) {
                    Optional<com.ragnarok.skill.AgentSkill> skillOpt = skillRegistry.getSkill(skillId);
                    if (skillOpt.isPresent()) {
                        com.ragnarok.skill.SkillResult result = skillOpt.get().execute(params);
                        if (result.isSuccess()) {
                            return String.format("\n\n> 🛠️ **Executed Tool**: `%s`\n```text\n%s\n```\n", skillId, result.getOutput());
                        } else {
                            return String.format("\n\n> ❌ **Tool Execution Error** (`%s`): %s\n", skillId, result.getError());
                        }
                    } else {
                        return String.format("\n\n> ❌ **Unknown Tool**: `%s`\n", skillId);
                    }
                }
            }
        } catch (Exception e) {
            return "\n\n> ⚠️ **Tool Execution Exception**: " + e.getMessage() + "\n";
        }
        return null;
    }

    public String executeUserPrompt(String sessionId, String prompt) {
        // Check for conversational human-in-the-loop email confirmation
        String draftActionReply = handlePendingDraftAction(sessionId, prompt);
        if (draftActionReply != null) {
            shortTermMemory.saveMessage(sessionId, "USER", prompt);
            shortTermMemory.saveMessage(sessionId, "ASSISTANT", draftActionReply);
            episodicMemory.logInteraction(sessionId, "USER", prompt, "SUCCESS", null);
            episodicMemory.logInteraction(sessionId, "ASSISTANT", draftActionReply, "SUCCESS", null);
            return draftActionReply;
        }

        String systemInstruction = buildSystemPrompt(sessionId, prompt);

        // Save User Input to Conversation Memory
        shortTermMemory.saveMessage(sessionId, "USER", prompt);

        // Query Ollama
        String aiResponse = chatClient.prompt()
                .system(systemInstruction)
                .user(prompt)
                .call()
                .content();

        extractAndStageEmailDraft(sessionId, aiResponse);
        String toolExecution = executeToolCallIfPresent(aiResponse);
        if (toolExecution != null) {
            aiResponse = aiResponse + toolExecution;
        }

        // Save AI Response to Conversation Memory
        shortTermMemory.saveMessage(sessionId, "ASSISTANT", aiResponse);

        return aiResponse;
    }

    public Flux<String> streamUserPrompt(String sessionId, String prompt) {
        // Check for conversational human-in-the-loop email confirmation
        String draftActionReply = handlePendingDraftAction(sessionId, prompt);
        if (draftActionReply != null) {
            shortTermMemory.saveMessage(sessionId, "USER", prompt);
            shortTermMemory.saveMessage(sessionId, "ASSISTANT", draftActionReply);
            return Flux.just(draftActionReply, "[DONE]");
        }

        String systemInstruction = buildSystemPrompt(sessionId, prompt);

        // Save User Input to Conversation Memory
        shortTermMemory.saveMessage(sessionId, "USER", prompt);

        // Stream from Ollama and execute any tool calls upon stream conclusion
        StringBuilder fullResponse = new StringBuilder();
        return chatClient.prompt()
                .system(systemInstruction)
                .user(prompt)
                .stream()
                .content()
                .doOnNext(fullResponse::append)
                .concatWith(Flux.defer(() -> {
                    String toolExecution = executeToolCallIfPresent(fullResponse.toString());
                    return toolExecution != null ? Flux.just(toolExecution) : Flux.empty();
                }))
                .concatWith(Flux.just("[DONE]"))
                .doOnComplete(() -> {
                    String finalContent = fullResponse.toString();
                    extractAndStageEmailDraft(sessionId, finalContent);
                    String toolExecution = executeToolCallIfPresent(finalContent);
                    if (toolExecution != null && !finalContent.contains(toolExecution)) {
                        finalContent = finalContent + toolExecution;
                    }
                    shortTermMemory.saveMessage(sessionId, "ASSISTANT", finalContent);
                });
    }
}
