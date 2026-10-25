package com.ragnarok.repository;

import com.ragnarok.entity.ChatMessageRecord;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatMessageRecordRepository extends JpaRepository<ChatMessageRecord, Long> {

    List<ChatMessageRecord> findTop10BySessionIdOrderByTimestampDesc(String sessionId);

    List<ChatMessageRecord> findAllBySessionIdOrderByTimestampAsc(String sessionId);

    @Query("SELECT c FROM ChatMessageRecord c WHERE c.sessionId = :sessionId ORDER BY c.timestamp DESC")
    List<ChatMessageRecord> findRecentBySessionId(@Param("sessionId") String sessionId, Pageable pageable);

    @Query("SELECT c FROM ChatMessageRecord c WHERE LOWER(c.content) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY c.timestamp DESC")
    List<ChatMessageRecord> searchByContent(@Param("query") String query);

    List<ChatMessageRecord> findByTimestampAfterOrderByTimestampAsc(LocalDateTime timestamp);

    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMessageRecord c WHERE c.timestamp < :cutoff")
    void deleteByTimestampBefore(@Param("cutoff") LocalDateTime cutoff);

    @Modifying
    @Transactional
    @Query("DELETE FROM ChatMessageRecord c WHERE c.sessionId = :sessionId")
    void deleteBySessionId(@Param("sessionId") String sessionId);
}
