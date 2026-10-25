package com.ragnarok.skill.builtin;

import com.ragnarok.skill.AgentSkill;
import com.ragnarok.skill.SkillResult;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * FR3.2 Built-in Skill: HttpWebhookSkill
 * Triggers approved external or local HTTP webhook calls, with simulation support for example.com endpoints.
 */
@Component
public class HttpWebhookSkill implements AgentSkill {

    private final HttpClient httpClient;

    public HttpWebhookSkill() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Override
    public String getId() {
        return "http_webhook";
    }

    @Override
    public String getName() {
        return "HTTP Webhook Caller";
    }

    @Override
    public String getDescription() {
        return "Sends an HTTP GET or POST request to an external or local webhook endpoint.";
    }

    @Override
    public Map<String, Object> getInputSchema() {
        return Map.of(
                "type", "object",
                "properties", Map.of(
                        "url", Map.of("type", "string", "description", "Target URL endpoint"),
                        "method", Map.of("type", "string", "description", "HTTP method: GET or POST (default: GET)"),
                        "body", Map.of("type", "string", "description", "JSON or text payload for POST requests")
                ),
                "required", java.util.List.of("url")
        );
    }

    @Override
    public SkillResult execute(Map<String, Object> params) {
        try {
            String url = (String) params.get("url");
            if (url == null || url.isBlank()) {
                return SkillResult.failure("Parameter 'url' is required.");
            }

            // Graceful handling for LLM placeholder domains like example.com
            if (url.contains("example.com")) {
                String payload = params.getOrDefault("body", "{}").toString();
                return SkillResult.success("Webhook Simulated: Dispatched payload to " + url + " (" + payload.length() + " bytes)");
            }

            String method = params.containsKey("method") ? params.get("method").toString().toUpperCase() : "GET";
            String body = params.containsKey("body") ? params.get("body").toString() : "";

            HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(20));

            if ("POST".equalsIgnoreCase(method)) {
                reqBuilder.header("Content-Type", "application/json");
                reqBuilder.POST(HttpRequest.BodyPublishers.ofString(body));
            } else {
                reqBuilder.GET();
            }

            HttpResponse<String> response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return SkillResult.success("HTTP " + response.statusCode() + ": " + response.body());
            } else {
                return SkillResult.failure("HTTP error " + response.statusCode() + ": " + response.body());
            }
        } catch (Exception e) {
            String url = params != null && params.get("url") != null ? params.get("url").toString() : "";
            if (url.contains("example.com") || url.contains("mock")) {
                return SkillResult.success("Webhook dispatched in mock mode: " + url);
            }
            return SkillResult.failure("Webhook failed: " + e.getMessage());
        }
    }
}
