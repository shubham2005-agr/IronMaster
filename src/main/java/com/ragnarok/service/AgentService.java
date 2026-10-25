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

    public AgentService(
            ChatClient chatClient,
            ShortTermMemoryService shortTermMemory,
            LongTermMemoryService longTermMemory,
            EpisodicMemoryService episodicMemory,
            EmailService emailService) {
        this.chatClient = chatClient;
        this.shortTermMemory = shortTermMemory;
        this.longTermMemory = longTermMemory;
        this.episodicMemory = episodicMemory;
        this.emailService = emailService;
    }

    private String buildSystemPrompt(String sessionId, String prompt) {
        // 1. Retrieve items from MariaDB Vector (top 4 chunks for efficiency)
        List<Document> matchedDocs = longTermMemory.searchVectorStore(prompt, 4);

        List<String> knowledgeBlocks = new ArrayList<>();
        List<String> memoryFactBlocks = new ArrayList<>();

        for (Document doc : matchedDocs) {
            Map<String, Object> meta = doc.getMetadata();
            String type = meta != null && meta.get("type") != null ? meta.get("type").toString() : "";
            String source = meta != null && meta.get("source") != null ? meta.get("source").toString() : null;
            String category = meta != null && meta.get("category") != null ? meta.get("category").toString() : "general";

            if ("knowledge_doc".equalsIgnoreCase(type) || "DOCUMENT".equalsIgnoreCase(type) || source != null) {
                knowledgeBlocks.add(String.format("[Source: %s | Category: %s]\n%s", 
                        source != null ? source : "Uploaded Document", category, doc.getText()));
            } else {
                memoryFactBlocks.add(String.format("[%s] %s", category, doc.getText()));
            }
        }

        String knowledgeSection = knowledgeBlocks.isEmpty()
                ? "No uploaded knowledge document snippets found for this query."
                : String.join("\n\n---\n", knowledgeBlocks);

        String longTermSection = memoryFactBlocks.isEmpty()
                ? "No specific prior user facts found."
                : String.join("\n- ", memoryFactBlocks);

        // 2. Retrieve Short-Term Memory (MySQL Conversation Buffer)
        List<ChatMessageRecord> history = shortTermMemory.getRecentContext(sessionId);
        String chatHistorySection = history.isEmpty()
                ? "No prior conversation messages in this session."
                : history.stream()
                .map(m -> m.getRole() + ": " + m.getContent())
                .collect(Collectors.joining("\n"));

        // 3. Assemble Unified System Prompt with Strict Formatting & Email Protocol
        return """
                You are Ragnarok, an intelligent, sovereign personal AI agent with hybrid dual persistent memory and autonomous action capabilities.

                === 1. RETRIEVED KNOWLEDGE DOCUMENTS (Uploaded by User) ===
                %s

                === 2. LONG-TERM SEMANTIC MEMORY (User Profile & Facts) ===
                %s

                === 3. SHORT-TERM CONVERSATION HISTORY (MySQL Session Buffer) ===
                %s

                === 4. EMAIL DISPATCH & HUMAN-IN-THE-LOOP CONFIRMATION RULES (CRITICAL) ===
                You are connected to an authentic Gmail SMTP Email Service (Sender: %s).
                When the user requests to send an email or message:
                1. IF RECIPIENT EMAIL IS MISSING:
                   Politely ask the user: "Could you please provide the recipient's email address?"
                   Do NOT make up a random email address.
                2. IF RECIPIENT EMAIL IS KNOWN:
                   Draft a professional subject and body based on the user's intent.
                   ALWAYS include the draft in this exact fenced code block so our interactive UI card can render it:
                   ```email-draft
                   {
                     "to": "recipient@example.com",
                     "subject": "Clear Subject Title",
                     "body": "Formatted email body text here"
                   }
                   ```
                   Directly follow the block with:
                   "⚠️ **Human Confirmation Required**: Should I send this email now? Reply **'Yes / Send it'** or click the **Send Email** button to confirm."
                3. NEVER claim you have sent an email without explicit human confirmation.

                === Operational & Formatting Rules ===
                1. Structure answers with clear Markdown (`### Header`, bullet points, bold key terms).
                2. Ground facts accurately in retrieved knowledge documents.
                3. Adhere to user preferences and maintain continuity.
                """.formatted(knowledgeSection, longTermSection, chatHistorySection, emailService.getSenderEmail());
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

        // Save User Input to Short-Term Memory & Episodic Log
        shortTermMemory.saveMessage(sessionId, "USER", prompt);
        episodicMemory.logInteraction(sessionId, "USER", prompt, "SUCCESS", null);

        // Query Ollama
        String aiResponse = chatClient.prompt()
                .system(systemInstruction)
                .user(prompt)
                .call()
                .content();

        extractAndStageEmailDraft(sessionId, aiResponse);

        // Save AI Response to Short-Term Memory & Episodic Log
        shortTermMemory.saveMessage(sessionId, "ASSISTANT", aiResponse);
        episodicMemory.logInteraction(sessionId, "ASSISTANT", aiResponse, "SUCCESS", null);

        return aiResponse;
    }

    public Flux<String> streamUserPrompt(String sessionId, String prompt) {
        // Check for conversational human-in-the-loop email confirmation
        String draftActionReply = handlePendingDraftAction(sessionId, prompt);
        if (draftActionReply != null) {
            shortTermMemory.saveMessage(sessionId, "USER", prompt);
            shortTermMemory.saveMessage(sessionId, "ASSISTANT", draftActionReply);
            episodicMemory.logInteraction(sessionId, "USER", prompt, "SUCCESS", null);
            episodicMemory.logInteraction(sessionId, "ASSISTANT", draftActionReply, "SUCCESS", null);
            return Flux.just(draftActionReply);
        }

        String systemInstruction = buildSystemPrompt(sessionId, prompt);

        // Save User Input to Short-Term Memory & Episodic Log
        shortTermMemory.saveMessage(sessionId, "USER", prompt);
        episodicMemory.logInteraction(sessionId, "USER", prompt, "SUCCESS", null);

        // Stream from Ollama and persist completed response
        StringBuilder fullResponse = new StringBuilder();
        return chatClient.prompt()
                .system(systemInstruction)
                .user(prompt)
                .stream()
                .content()
                .doOnNext(fullResponse::append)
                .doOnComplete(() -> {
                    String finalContent = fullResponse.toString();
                    extractAndStageEmailDraft(sessionId, finalContent);
                    shortTermMemory.saveMessage(sessionId, "ASSISTANT", finalContent);
                    episodicMemory.logInteraction(sessionId, "ASSISTANT", finalContent, "SUCCESS", null);
                });
    }
}
