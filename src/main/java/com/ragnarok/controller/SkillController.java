package com.ragnarok.controller;

import com.ragnarok.entity.SkillDefinition;
import com.ragnarok.repository.SkillDefinitionRepository;
import com.ragnarok.skill.AgentSkill;
import com.ragnarok.skill.SkillRegistry;
import com.ragnarok.skill.SkillResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/skills")
public class SkillController {

    private final SkillRegistry skillRegistry;
    private final SkillDefinitionRepository skillDefinitionRepository;

    public SkillController(
            SkillRegistry skillRegistry,
            SkillDefinitionRepository skillDefinitionRepository) {
        this.skillRegistry = skillRegistry;
        this.skillDefinitionRepository = skillDefinitionRepository;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getSkills() {
        return ResponseEntity.ok(skillRegistry.getSkillDescriptionsForLlm());
    }

    @PostMapping("/execute")
    public ResponseEntity<SkillResult> executeSkill(@RequestBody(required = false) Map<String, Object> request) {
        if (request == null || request.isEmpty()) {
            return ResponseEntity.badRequest().body(SkillResult.failure("Request body is required."));
        }

        String skillId = (String) request.get("skillId");
        if (skillId == null || skillId.isBlank()) {
            skillId = (String) request.get("name");
        }
        if (skillId == null || skillId.isBlank()) {
            skillId = (String) request.get("id");
        }
        if (skillId == null || skillId.isBlank()) {
            skillId = (String) request.get("skill");
        }

        if (skillId == null || skillId.isBlank()) {
            return ResponseEntity.badRequest().body(SkillResult.failure("Parameter 'skillId' or 'name' is required."));
        }

        Map<String, Object> params = Collections.emptyMap();
        Object rawParams = request.get("parameters");
        if (rawParams instanceof Map<?, ?> m) {
            @SuppressWarnings("unchecked")
            Map<String, Object> casted = (Map<String, Object>) m;
            params = casted;
        } else if (rawParams instanceof String s && !s.isBlank()) {
            try {
                params = new com.fasterxml.jackson.databind.ObjectMapper().readValue(s, new com.fasterxml.jackson.core.type.TypeReference<>() {});
            } catch (Exception ignored) {}
        } else {
            // Check if parameters were provided flattened at root level
            Map<String, Object> flattened = new HashMap<>(request);
            flattened.remove("skillId");
            flattened.remove("name");
            flattened.remove("id");
            flattened.remove("skill");
            flattened.remove("parameters");
            if (!flattened.isEmpty()) {
                params = flattened;
            }
        }

        return executeSkillInternal(skillId, params);
    }

    @PostMapping("/{skillId}/execute")
    public ResponseEntity<SkillResult> executeSkillByPath(
            @PathVariable String skillId,
            @RequestBody(required = false) Map<String, Object> request) {
        Map<String, Object> params = Collections.emptyMap();
        if (request != null) {
            Object rawParams = request.get("parameters");
            if (rawParams instanceof Map<?, ?> m) {
                @SuppressWarnings("unchecked")
                Map<String, Object> casted = (Map<String, Object>) m;
                params = casted;
            } else {
                params = request;
            }
        }
        return executeSkillInternal(skillId, params);
    }

    private ResponseEntity<SkillResult> executeSkillInternal(String skillId, Map<String, Object> params) {
        Optional<AgentSkill> skillOpt = skillRegistry.getSkill(skillId);
        if (skillOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(SkillResult.failure("Skill not found: " + skillId));
        }

        SkillResult result = skillOpt.get().execute(params);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/custom")
    public ResponseEntity<Map<String, Object>> registerCustomSkill(@RequestBody Map<String, String> request) {
        String skillId = request.get("skillId");
        String name = request.get("name");
        String description = request.get("description");
        String scriptType = request.getOrDefault("scriptType", "SHELL");
        String scriptContent = request.get("scriptContent");
        String schema = request.getOrDefault("inputSchemaJson", "{}");

        if (skillId == null || scriptContent == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "skillId and scriptContent are required."));
        }

        LocalDateTime now = LocalDateTime.now();
        SkillDefinition def = new SkillDefinition(
                null,
                skillId,
                name != null ? name : skillId,
                description,
                scriptType,
                scriptContent,
                schema,
                true,
                now,
                now
        );
        skillDefinitionRepository.save(def);
        skillRegistry.registerCustomSkill(def);

        return ResponseEntity.ok(Map.of(
                "status", "Custom skill registered successfully",
                "skillId", skillId
        ));
    }
}
