package com.piquenozap.piquenozapbackend.controller;

import com.piquenozap.piquenozapbackend.model.ChatMessage;
import com.piquenozap.piquenozapbackend.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.time.LocalDateTime;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @MessageMapping("/chat.sendPrivateMessage")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage) {

        chatMessage.setTimestamp(LocalDateTime.now());

        chatMessageRepository.save(chatMessage);
        
        messagingTemplate.convertAndSendToUser(
            chatMessage.getRecipientEmail(), 
            "/queue/messages", 
            chatMessage
        );
    }

    @MessageMapping("/chat.sendGroupMessage")
    public void sendGroupMessage(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(LocalDateTime.now());
        String groupTopic = "/topic/group/" + chatMessage.getGroupId();
        messagingTemplate.convertAndSend(groupTopic, chatMessage);
    }
}