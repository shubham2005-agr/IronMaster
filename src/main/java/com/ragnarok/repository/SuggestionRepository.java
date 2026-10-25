package com.ragnarok.repository;

import com.ragnarok.entity.SuggestionCard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SuggestionRepository extends JpaRepository<SuggestionCard, Long> {

    List<SuggestionCard> findAllByStatusOrderByCreatedAtDesc(String status);
}
