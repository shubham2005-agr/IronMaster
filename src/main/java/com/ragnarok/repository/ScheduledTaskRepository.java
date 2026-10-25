package com.ragnarok.repository;

import com.ragnarok.entity.ScheduledTaskRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduledTaskRepository extends JpaRepository<ScheduledTaskRecord, Long> {

    List<ScheduledTaskRecord> findAllByEnabledTrue();
}
