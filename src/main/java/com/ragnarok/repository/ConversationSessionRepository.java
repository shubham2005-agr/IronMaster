package com.ragnarok.repository;

import com.ragnarok.entity.ConversationSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationSessionRepository extends JpaRepository<ConversationSession, Long> {

    Optional<ConversationSession> findBySessionId(String sessionId);

    List<ConversationSession> findAllByOrderByUpdatedAtDesc();

    @Modifying
    @Transactional
    @Query("DELETE FROM ConversationSession s WHERE s.sessionId = :sessionId")
    void deleteBySessionId(@Param("sessionId") String sessionId);
}
