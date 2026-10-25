package com.ragnarok.repository;

import com.ragnarok.entity.SkillDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillDefinitionRepository extends JpaRepository<SkillDefinition, Long> {

    Optional<SkillDefinition> findBySkillId(String skillId);

    List<SkillDefinition> findAllByEnabledTrue();
}
