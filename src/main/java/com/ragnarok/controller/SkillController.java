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
    public ResponseEntity<SkillResult> executeSkill(@RequestBody Map<String, Object> request) {
        String skillId = (String) request.get("skillId");
        @SuppressWarnings("unchecked")
        Map<String, Object> params = (Map<String, Object>) request.getOrDefault("parameters", Collections.emptyMap());

        if (skillId == null || skillId.isBlank()) {
            return ResponseEntity.badRequest().body(SkillResult.failure("Parameter 'skillId' is required."));
        }

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
