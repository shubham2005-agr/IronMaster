package com.ragnarok.repository;

import com.ragnarok.entity.WorkflowExecutionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowExecutionRepository extends JpaRepository<WorkflowExecutionRecord, Long> {

    Optional<WorkflowExecutionRecord> findByPlanId(String planId);

    List<WorkflowExecutionRecord> findAllByOrderByCreatedAtDesc();
}
