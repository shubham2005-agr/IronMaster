package com.ragnarok.controller;

import com.ragnarok.dto.EmailDraft;
import com.ragnarok.dto.EmailRequest;
import com.ragnarok.dto.EmailResponse;
import com.ragnarok.service.EmailService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/email")
public class EmailController {

    private final EmailService emailService;

    public EmailController(EmailService emailService) {
        this.emailService = emailService;
    }

    /**
     * Manual email dispatch endpoint.
     */
    @PostMapping("/send")
    public ResponseEntity<EmailResponse> sendEmail(@RequestBody EmailRequest request) {
        if (request.getTo() == null || !emailService.isValidEmail(request.getTo())) {
            return ResponseEntity.badRequest().body(
                    new EmailResponse(false, "Invalid recipient email address format: " + request.getTo(), request.getTo(), request.getSubject())
            );
        }

        EmailResponse response = emailService.sendEmail(request.getTo(), request.getSubject(), request.getBody());
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.internalServerError().body(response);
        }
    }

    /**
     * Creates a staged draft awaiting human confirmation before sending.
     */
    @PostMapping("/draft")
    public ResponseEntity<EmailDraft> createDraft(@RequestBody EmailRequest request) {
        EmailDraft draft = emailService.createDraft(
                request.getSessionId(),
                request.getTo(),
                request.getSubject(),
                request.getBody()
        );
        return ResponseEntity.ok(draft);
    }

    /**
     * Confirms and sends a staged draft upon human approval.
     */
    @PostMapping("/confirm/{draftId}")
    public ResponseEntity<EmailResponse> confirmAndSend(@PathVariable("draftId") String draftId) {
        EmailResponse response = emailService.confirmAndSendDraft(draftId);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Cancels a pending draft.
     */
    @PostMapping("/cancel/{draftId}")
    public ResponseEntity<Map<String, Object>> cancelDraft(@PathVariable("draftId") String draftId) {
        boolean cancelled = emailService.cancelDraft(draftId);
        return ResponseEntity.ok(Map.of("cancelled", cancelled, "draftId", draftId));
    }

    /**
     * Retrieves the latest pending draft for a session.
     */
    @GetMapping("/session/{sessionId}/pending")
    public ResponseEntity<?> getPendingDraft(@PathVariable("sessionId") String sessionId) {
        Optional<EmailDraft> draft = emailService.getLatestPendingDraftForSession(sessionId);
        if (draft.isPresent()) {
            return ResponseEntity.ok(draft.get());
        }
        return ResponseEntity.noContent().build();
    }

    /**
     * Returns email service configuration metadata (sanitized).
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        return ResponseEntity.ok(Map.of(
                "configured", true,
                "senderEmail", emailService.getSenderEmail(),
                "smtpHost", "smtp.gmail.com",
                "smtpPort", 587
        ));
    }
}
