package com.ragnarok.service;

import com.ragnarok.dto.EmailDraft;
import com.ragnarok.dto.EmailResponse;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Sovereign Email Service with Human-in-the-Loop Confirmation:
 * Supports direct manual sending, pending draft staging, and conversational confirmation.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$"
    );

    private final JavaMailSender mailSender;
    private final String senderEmail;

    // Concurrent in-memory store for pending human-in-the-loop drafts
    private final Map<String, EmailDraft> pendingDrafts = new ConcurrentHashMap<>();

    public EmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String senderEmail) {
        this.mailSender = mailSender;
        this.senderEmail = senderEmail;
        log.info("[EmailService] Initialized with sender account: {}", senderEmail);
    }

    public String getSenderEmail() {
        return senderEmail;
    }

    public boolean isValidEmail(String email) {
        if (email == null || email.isBlank()) {
            return false;
        }
        return EMAIL_PATTERN.matcher(email.trim()).matches();
    }

    /**
     * Directly sends an email via SMTP.
     */
    public EmailResponse sendEmail(String to, String subject, String body) {
        if (to == null || !isValidEmail(to)) {
            return new EmailResponse(false, "Invalid recipient email address: " + to, to, subject);
        }
        if (subject == null || subject.isBlank()) {
            subject = "(No Subject)";
        }
        if (body == null || body.isBlank()) {
            body = "(Empty Message)";
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderEmail, "Ragnarok AI Sovereign Agent");
            helper.setTo(to.trim());
            helper.setSubject(subject.trim());
            
            // Check if HTML or plain text
            boolean isHtml = body.contains("<") && body.contains(">") && (body.contains("</p>") || body.contains("<br") || body.contains("</div>"));
            helper.setText(body, isHtml);

            mailSender.send(message);

            log.info("[EmailService] Successfully dispatched email to '{}' with subject '{}'", to, subject);
            return new EmailResponse(true, "Email successfully sent to " + to.trim(), to.trim(), subject.trim());
        } catch (Exception e) {
            log.error("[EmailService] Failed to send email to '{}': {}", to, e.getMessage(), e);
            return new EmailResponse(false, "Failed to send email: " + e.getMessage(), to, subject);
        }
    }

    /**
     * Creates a staged draft awaiting human confirmation before sending.
     */
    public EmailDraft createDraft(String sessionId, String to, String subject, String body) {
        String draftId = "draft-" + UUID.randomUUID().toString().substring(0, 8);
        EmailDraft draft = new EmailDraft(draftId, sessionId, to != null ? to.trim() : null, subject, body);
        pendingDrafts.put(draftId, draft);
        log.info("[EmailService] Staged new email draft '{}' for session '{}' to '{}'", draftId, sessionId, to);
        return draft;
    }

    public Optional<EmailDraft> getDraft(String draftId) {
        if (draftId == null) return Optional.empty();
        return Optional.ofNullable(pendingDrafts.get(draftId));
    }

    /**
     * Finds the most recent pending draft for a given conversation session.
     */
    public Optional<EmailDraft> getLatestPendingDraftForSession(String sessionId) {
        if (sessionId == null) return Optional.empty();
        return pendingDrafts.values().stream()
                .filter(d -> sessionId.equalsIgnoreCase(d.getSessionId()))
                .filter(d -> "PENDING_CONFIRMATION".equalsIgnoreCase(d.getStatus()))
                .max(Comparator.comparing(EmailDraft::getCreatedAt));
    }

    /**
     * Confirms and sends a staged draft upon human approval.
     */
    public EmailResponse confirmAndSendDraft(String draftId) {
        EmailDraft draft = pendingDrafts.get(draftId);
        if (draft == null) {
            return new EmailResponse(false, "Draft not found or already processed: " + draftId, null, null);
        }

        if (!"PENDING_CONFIRMATION".equalsIgnoreCase(draft.getStatus())) {
            return new EmailResponse(false, "Draft status is " + draft.getStatus() + "; cannot send.", draft.getTo(), draft.getSubject(), draftId);
        }

        EmailResponse response = sendEmail(draft.getTo(), draft.getSubject(), draft.getBody());
        if (response.isSuccess()) {
            draft.setStatus("SENT");
            draft.setSentAt(LocalDateTime.now());
            response.setDraftId(draftId);
        }
        return response;
    }

    /**
     * Cancels a pending draft.
     */
    public boolean cancelDraft(String draftId) {
        EmailDraft draft = pendingDrafts.get(draftId);
        if (draft != null && "PENDING_CONFIRMATION".equalsIgnoreCase(draft.getStatus())) {
            draft.setStatus("CANCELLED");
            log.info("[EmailService] User cancelled email draft '{}'", draftId);
            return true;
        }
        return false;
    }

    public List<EmailDraft> getAllDraftsForSession(String sessionId) {
        if (sessionId == null) return Collections.emptyList();
        return pendingDrafts.values().stream()
                .filter(d -> sessionId.equalsIgnoreCase(d.getSessionId()))
                .sorted(Comparator.comparing(EmailDraft::getCreatedAt).reversed())
                .toList();
    }
}
