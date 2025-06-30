package com.piquenozap.piquenozapbackend.repository;

import com.piquenozap.piquenozapbackend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param; 
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    @Query("SELECT m FROM ChatMessage m WHERE " +
           "(m.sender = :email1 AND m.recipientEmail = :email2) OR " +
           "(m.sender = :email2 AND m.recipientEmail = :email1) " +
           "ORDER BY m.timestamp ASC")
    List<ChatMessage> findConversationByEmails(
            @Param("email1") String email1,
            @Param("email2") String email2
    );
}