package com.piquenozap.piquenozapbackend.repository;

import com.piquenozap.piquenozapbackend.model.ChatGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {
}