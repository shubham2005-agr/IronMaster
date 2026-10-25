package com.ragnarok.skill.builtin;

import com.ragnarok.dto.EmailResponse;
import com.ragnarok.service.EmailService;
import com.ragnarok.skill.AgentSkill;
import com.ragnarok.skill.SkillResult;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * Built-in Agent Skill: SendEmailSkill
 * Enables autonomous and supervised email sending through Gmail SMTP.
 */
@Component
public class SendEmailSkill implements AgentSkill {

    private final EmailService emailService;

    public SendEmailSkill(EmailService emailService) {
        this.emailService = emailService;
    }

    @Override
    public String getId() {
        return "email_send";
    }

    @Override
    public String getName() {
        return "Send Email via SMTP";
    }

    @Override
    public String getDescription() {
        return "Dispatches an email to a recipient email address using configured Gmail SMTP. Parameters: to (email), subject, body.";
    }

    @Override
    public Map<String, Object> getInputSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "to", Map.of("type", "string", "description", "Destination recipient email address (e.g. user@example.com)"),
                        "subject", Map.of("type", "string", "description", "Email subject title"),
                        "body", Map.of("type", "string", "description", "Email body content (plain text or HTML)")
                ),
                "required", List.of("to", "body")
        );
    }

    @Override
    public SkillResult execute(Map<String, Object> params) {
        try {
            if (params == null) {
                return SkillResult.failure("Parameters cannot be null.");
            }

            String to = params.get("to") != null ? params.get("to").toString().trim() : null;
            String subject = params.get("subject") != null ? params.get("subject").toString().trim() : "Notification from Ragnarok Agent";
            String body = params.get("body") != null ? params.get("body").toString() : null;

            if (to == null || to.isBlank()) {
                return SkillResult.failure("Parameter 'to' (recipient email) is required.");
            }
            if (body == null || body.isBlank()) {
                return SkillResult.failure("Parameter 'body' is required.");
            }

            if (!emailService.isValidEmail(to)) {
                return SkillResult.failure("Recipient email '" + to + "' is not a valid email address format.");
            }

            EmailResponse response = emailService.sendEmail(to, subject, body);
            if (response.isSuccess()) {
                return SkillResult.success("Email sent to " + to + " [Subject: " + subject + "] at " + response.getTimestamp());
            } else {
                return SkillResult.failure(response.getMessage());
            }
        } catch (Exception e) {
            return SkillResult.failure("Email dispatch exception: " + e.getMessage());
        }
    }
}
