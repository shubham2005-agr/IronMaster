package com.ragnarok.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "skill_definitions")
public class SkillDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String skillId;

    @Column(nullable = false, length = 128)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 32)
    private String scriptType = "SHELL"; // SHELL, PYTHON, JS

    @Column(columnDefinition = "TEXT")
    private String scriptContent;

    @Column(columnDefinition = "TEXT")
    private String inputSchemaJson;

    private boolean enabled = true;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public SkillDefinition() {
    }

    public SkillDefinition(Long id, String skillId, String name, String description, String scriptType, String scriptContent, String inputSchemaJson, boolean enabled, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.skillId = skillId;
        this.name = name;
        this.description = description;
        this.scriptType = scriptType;
        this.scriptContent = scriptContent;
        this.inputSchemaJson = inputSchemaJson;
        this.enabled = enabled;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long id;
        private String skillId;
        private String name;
        private String description;
        private String scriptType = "SHELL";
        private String scriptContent;
        private String inputSchemaJson;
        private boolean enabled = true;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public Builder id(Long id) {
            this.id = id;
            return this;
        }

        public Builder skillId(String skillId) {
            this.skillId = skillId;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder description(String description) {
            this.description = description;
            return this;
        }

        public Builder scriptType(String scriptType) {
            this.scriptType = scriptType;
            return this;
        }

        public Builder scriptContent(String scriptContent) {
            this.scriptContent = scriptContent;
            return this;
        }

        public Builder inputSchemaJson(String inputSchemaJson) {
            this.inputSchemaJson = inputSchemaJson;
            return this;
        }

        public Builder enabled(boolean enabled) {
            this.enabled = enabled;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public SkillDefinition build() {
            return new SkillDefinition(id, skillId, name, description, scriptType, scriptContent, inputSchemaJson, enabled, createdAt, updatedAt);
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSkillId() {
        return skillId;
    }

    public void setSkillId(String skillId) {
        this.skillId = skillId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getScriptType() {
        return scriptType;
    }

    public void setScriptType(String scriptType) {
        this.scriptType = scriptType;
    }

    public String getScriptContent() {
        return scriptContent;
    }

    public void setScriptContent(String scriptContent) {
        this.scriptContent = scriptContent;
    }

    public String getInputSchemaJson() {
        return inputSchemaJson;
    }

    public void setInputSchemaJson(String inputSchemaJson) {
        this.inputSchemaJson = inputSchemaJson;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
