package com.piquenozap.piquenozapbackend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity 
@Table(name = "chat_messages") // <-- Nome da tabela no banco
public class ChatMessage {

    @Id 
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String content;
    private String sender;
    private String recipientEmail;
    private MessageType type;
    private LocalDateTime timestamp;
    private Long groupId;

    public enum MessageType {
        CHAT,
        JOIN,
        LEAVE,
        GROUP_CHAT
    }
}