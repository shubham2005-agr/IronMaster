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
        if (skillId == null || skillId.isBlank()) {
            return Optional.empty();
        }

        String raw = skillId.trim();

        // 1. Direct match on ID
        if (registeredSkills.containsKey(raw)) {
            return Optional.of(registeredSkills.get(raw));
        }

        // 2. Case-insensitive match on ID
        for (Map.Entry<String, AgentSkill> entry : registeredSkills.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(raw)) {
                return Optional.of(entry.getValue());
            }
        }

        // 2b. Match on Skill Name
        for (AgentSkill skill : registeredSkills.values()) {
            if (skill.getName() != null && skill.getName().equalsIgnoreCase(raw)) {
                return Optional.of(skill);
            }
        }

        // 3. Canonical alias resolution for LLM mutations & UI catalog calls
        String normalized = raw.toLowerCase().replaceAll("[-_\\s]", "");
        if (normalized.endsWith("skill") && normalized.length() > 5) {
            normalized = normalized.substring(0, normalized.length() - 5);
        }

        String canonicalId = switch (normalized) {
            case "fileread", "readworkspacefile", "readfile", "viewfile", "cat" -> "file_read";
            case "filewrite", "writeworkspacefile", "writefile", "createfile", "savefile" -> "file_write";
            case "filesearch", "searchfilecontent", "searchfile", "grep", "findtext" -> "file_search";
            case "shellcommand", "executesandboxedshellcommand", "shell", "cmd", "command", "powershell", "bash", "terminal", "exec" -> "shell_command";
            case "knowledgesearch", "searchvectorknowledgestore", "searchknowledgedatabase", "searchknowledge", "vectorsearch", "semanticsearch", "rag", "vectormemory" -> "knowledge_search";
            case "httpwebhook", "httpwebhookcaller", "webhook", "http", "curl", "apicall" -> "http_webhook";
            case "emailsend", "sendemailsmtp", "sendemail", "email", "mail", "sendmail" -> "email_send";
            default -> null;
        };

        if (canonicalId != null && registeredSkills.containsKey(canonicalId)) {
            return Optional.of(registeredSkills.get(canonicalId));
        }

        return Optional.empty();
    }

    public Collection<AgentSkill> getAllSkills() {
        return registeredSkills.values();
    }

    public List<Map<String, Object>> getSkillDescriptionsForLlm() {
        List<Map<String, Object>> list = new ArrayList<>();
        for (AgentSkill skill : registeredSkills.values()) {
            String type = switch (skill.getId()) {
                case "file_read", "file_write" -> "IO";
                case "file_search" -> "Search";
                case "shell_command" -> "System";
                case "knowledge_search" -> "RAG";
                case "email_send" -> "Alert";
                case "http_webhook" -> "Webhook";
                default -> "Custom";
            };

            String sample = switch (skill.getId()) {
                case "file_read" -> "{\"filePath\": \"pom.xml\"}";
                case "file_write" -> "{\"filePath\": \"sandbox_test.txt\", \"content\": \"Hello from Ragnarok Skill Catalog!\"}";
                case "file_search" -> "{\"filePath\": \"pom.xml\", \"pattern\": \"spring\"}";
                case "shell_command" -> "{\"command\": \"cmd.exe /c echo Hello Ragnarok Sandbox\"}";
                case "knowledge_search" -> "{\"query\": \"agent architecture\"}";
                case "email_send" -> "{\"to\": \"admin@ragnarok.ai\", \"subject\": \"System Notice\", \"body\": \"Skill catalog alert notification\"}";
                case "http_webhook" -> "{\"url\": \"http://localhost:8080/api/auth/me\", \"method\": \"GET\"}";
                default -> "{}";
            };

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("skillId", skill.getId());
            map.put("name", skill.getName());
            map.put("description", skill.getDescription());
            map.put("type", type);
            map.put("defaultParam", sample);
            map.put("inputSchema", skill.getInputSchema());

            list.add(map);
        }
        return list;
    }
}
