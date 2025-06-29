package com.piquenozap.piquenozapbackend.controller;

import com.piquenozap.piquenozapbackend.model.ChatMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.sendPrivateMessage")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage) {
        // MODIFICADO: Usa o email do destinatário para rotear a mensagem.
        // O Spring vai encontrar a sessão do WebSocket cujo Principal (usuário logado)
        // tem o nome igual a este email.
        messagingTemplate.convertAndSendToUser(
            chatMessage.getRecipientEmail(), 
            "/queue/messages", 
            chatMessage
        );
    }
}