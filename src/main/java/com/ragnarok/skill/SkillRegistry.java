package com.ragnarok.skill;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ragnarok.entity.SkillDefinition;
import com.ragnarok.repository.SkillDefinitionRepository;
import com.ragnarok.sandbox.ProcessBuilderSandboxExecutor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * FR2.1 (Skill Registration):
 * Dynamic skill registry managing both Spring Component skills and MySQL user-defined scripts.
 */
@Component
public class SkillRegistry {

    private static final Logger log = LoggerFactory.getLogger(SkillRegistry.class);

    private final Map<String, AgentSkill> registeredSkills = new ConcurrentHashMap<>();
    private final SkillDefinitionRepository skillDefinitionRepository;
    private final ProcessBuilderSandboxExecutor sandboxExecutor;
    private final ObjectMapper objectMapper;

    public SkillRegistry(
            List<AgentSkill> springSkills,
            SkillDefinitionRepository skillDefinitionRepository,
            ProcessBuilderSandboxExecutor sandboxExecutor) {
        this.skillDefinitionRepository = skillDefinitionRepository;
        this.sandboxExecutor = sandboxExecutor;
        this.objectMapper = new ObjectMapper();

        // 1. Register Spring component skills
        for (AgentSkill skill : springSkills) {
            registeredSkills.put(skill.getId(), skill);
            log.info("[SkillRegistry] Registered built-in skill: {} ({})", skill.getName(), skill.getId());
        }

        // 2. Load enabled user-defined script skills from MySQL
        loadCustomSkillsFromDatabase();
    }

    public void loadCustomSkillsFromDatabase() {
        try {
            List<SkillDefinition> customDefinitions = skillDefinitionRepository.findAllByEnabledTrue();
            for (SkillDefinition def : customDefinitions) {
                registerCustomSkill(def);
            }
        } catch (Exception e) {
            log.warn("[SkillRegistry] Could not load custom skills at startup: {}", e.getMessage());
        }
    }

    public void registerSkill(AgentSkill skill) {
        registeredSkills.put(skill.getId(), skill);
        log.info("[SkillRegistry] Dynamically registered skill: {}", skill.getId());
    }

    public void registerCustomSkill(SkillDefinition def) {
        AgentSkill dynamicSkill = new AgentSkill() {
            @Override
            public String getId() {
                return def.getSkillId();
            }

            @Override
            public String getName() {
                return def.getName();
            }

            @Override
            public String getDescription() {
                return def.getDescription();
            }

            @Override
            public Map<String, Object> getInputSchema() {
                if (def.getInputSchemaJson() != null && !def.getInputSchemaJson().isBlank()) {
                    try {
                        return objectMapper.readValue(def.getInputSchemaJson(), new TypeReference<>() {});
                    } catch (Exception ignored) {}
                }
                return Map.of("type", "object");
            }

            @Override
            public SkillResult execute(Map<String, Object> params) {
                // Execute user script via sandbox
                String script = def.getScriptContent();
                if (params != null && !params.isEmpty()) {
                    for (Map.Entry<String, Object> entry : params.entrySet()) {
                        script = script.replace("${" + entry.getKey() + "}", String.valueOf(entry.getValue()));
                    }
                }
                return sandboxExecutor.executeCommand(script);
            }
        };

        registeredSkills.put(def.getSkillId(), dynamicSkill);
    }

    public Optional<AgentSkill> getSkill(String skillId) {
        return Optional.ofNullable(registeredSkills.get(skillId));
    }

    public Collection<AgentSkill> getAllSkills() {
        return registeredSkills.values();
    }

    public List<Map<String, Object>> getSkillDescriptionsForLlm() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (AgentSkill skill : registeredSkills.values()) {
            list.add(Map.of(
                    "skillId", skill.getId(),
                    "name", skill.getName(),
                    "description", skill.getDescription(),
                    "inputSchema", skill.getInputSchema()
            ));
        }
        return list;
    }
}
