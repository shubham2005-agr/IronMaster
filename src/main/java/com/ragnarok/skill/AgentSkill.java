package com.ragnarok.skill;

import java.util.Map;

/**
 * FR2.1 (Skill Registration):
 * Interface for all modular agent skills and tool definitions.
 */
public interface AgentSkill {

    String getId();

    String getName();

    String getDescription();

    Map<String, Object> getInputSchema();

    SkillResult execute(Map<String, Object> params);
}
