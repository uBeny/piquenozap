package com.piquenozap.piquenozapbackend.controller;

import com.piquenozap.piquenozapbackend.model.ChatMessage;
import com.piquenozap.piquenozapbackend.repository.ChatMessageRepository;
import com.piquenozap.piquenozapbackend.service.BlockService; // IMPORTAR O NOVO SERVIÇO
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.time.LocalDateTime;
import java.util.logging.Logger;

@Controller
public class ChatController {

    private static final Logger LOGGER = Logger.getLogger(ChatController.class.getName());

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private BlockService blockService; // INJETAR O SERVIÇO DE BLOQUEIO

    @MessageMapping("/chat.sendPrivateMessage")
    public void sendPrivateMessage(@Payload ChatMessage chatMessage) {

        String recipient = chatMessage.getRecipientEmail();
        String sender = chatMessage.getSender();

        // VERIFICAÇÃO DE BLOQUEIO: Se o destinatário bloqueou o remetente
        if (blockService.isBlocked(recipient, sender)) {
            // Loga a ação e simplesmente não faz nada. A mensagem é descartada.
            LOGGER.info(String.format("Mensagem de %s para %s foi DESCARTADA porque o remetente está bloqueado.", sender, recipient));
            return; // Encerra o método aqui
        }

        // Se não houver bloqueio, a lógica original continua
        chatMessage.setTimestamp(LocalDateTime.now());
        chatMessageRepository.save(chatMessage);
        
        messagingTemplate.convertAndSendToUser(
            recipient,
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