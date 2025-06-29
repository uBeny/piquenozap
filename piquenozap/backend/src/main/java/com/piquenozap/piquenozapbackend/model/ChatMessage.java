package com.piquenozap.piquenozapbackend.model;

import lombok.Data;

@Data
public class ChatMessage {
    private String content;
    private String sender;
    private String recipientEmail; 
    private MessageType type;

    public enum MessageType {
        CHAT,
        JOIN,
        LEAVE
    }
}