package com.piquenozap.piquenozapbackend.controller;

import com.piquenozap.piquenozapbackend.model.ChatMessage;
import com.piquenozap.piquenozapbackend.repository.ChatMessageRepository;
import com.piquenozap.piquenozapbackend.service.BlockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.logging.Logger;

@Controller
public class ChatController {

    private static final Logger LOGGER = Logger.getLogger(ChatController.class.getName());

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private BlockService blockService;

    @MessageMapping("/chat.sendPrivateMessage")
    @Transactional
    public void sendPrivateMessage(@Payload ChatMessage chatMessage) {
        String recipient = chatMessage.getRecipientEmail();
        String sender = chatMessage.getSender();

        if (blockService.isBlocked(recipient, sender)) {
            LOGGER.info(String.format("Mensagem de %s para %s foi DESCARTADA porque o remetente está bloqueado.", sender, recipient));
            return;
        }

        chatMessage.setTimestamp(LocalDateTime.now());
        ChatMessage savedMessage = chatMessageRepository.save(chatMessage);

        messagingTemplate.convertAndSendToUser(recipient, "/queue/messages", savedMessage);
        messagingTemplate.convertAndSendToUser(sender, "/queue/messages", savedMessage);
    }

    @MessageMapping("/chat.sendGroupMessage")
    @Transactional
    public void sendGroupMessage(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(LocalDateTime.now());
        ChatMessage savedMessage = chatMessageRepository.save(chatMessage);
        String groupTopic = "/topic/group/" + savedMessage.getGroupId();
        messagingTemplate.convertAndSend(groupTopic, savedMessage);
    }

    @MessageMapping("/chat.editMessage")
    @Transactional // <-- 2. ADICIONE A ANOTAÇÃO AQUI
    public void editMessage(@Payload ChatMessage editedMessage) {
        Optional<ChatMessage> existingMessageOpt = chatMessageRepository.findById(editedMessage.getId());
        if (existingMessageOpt.isPresent()) {
            ChatMessage existingMessage = existingMessageOpt.get();
            if (!existingMessage.getSender().equals(editedMessage.getSender())) {
                 LOGGER.warning(String.format("Tentativa de edição não autorizada da mensagem %d por %s.", editedMessage.getId(), editedMessage.getSender()));
                 return;
            }

            existingMessage.setContent(editedMessage.getContent());
            existingMessage.setType(ChatMessage.MessageType.EDIT);
            existingMessage.setTimestamp(LocalDateTime.now());
            // O @Transactional garante que o save() será efetivado
            chatMessageRepository.save(existingMessage);

            if (existingMessage.getGroupId() != null) {
                String groupTopic = "/topic/group/" + existingMessage.getGroupId();
                messagingTemplate.convertAndSend(groupTopic, existingMessage);
            } else {
                messagingTemplate.convertAndSendToUser(existingMessage.getRecipientEmail(), "/queue/messages", existingMessage);
                messagingTemplate.convertAndSendToUser(existingMessage.getSender(), "/queue/messages", existingMessage);
            }
        }
    }

    @MessageMapping("/chat.deleteMessage")
    @Transactional // <-- 3. E AQUI TAMBÉM (BOA PRÁTICA)
    public void deleteMessage(@Payload ChatMessage messageToDelete) {
         Optional<ChatMessage> existingMessageOpt = chatMessageRepository.findById(messageToDelete.getId());
         if (existingMessageOpt.isPresent()) {
            ChatMessage existingMessage = existingMessageOpt.get();
            if (!existingMessage.getSender().equals(messageToDelete.getSender())) {
                 LOGGER.warning(String.format("Tentativa de exclusão não autorizada da mensagem %d por %s.", messageToDelete.getId(), messageToDelete.getSender()));
                return;
            }

            existingMessage.setType(ChatMessage.MessageType.DELETE);

            if (existingMessage.getGroupId() != null) {
                String groupTopic = "/topic/group/" + existingMessage.getGroupId();
                messagingTemplate.convertAndSend(groupTopic, existingMessage);
            } else {
                messagingTemplate.convertAndSendToUser(existingMessage.getRecipientEmail(), "/queue/messages", existingMessage);
                messagingTemplate.convertAndSendToUser(existingMessage.getSender(), "/queue/messages", existingMessage);
            }
             
             chatMessageRepository.deleteById(existingMessage.getId());
         }
    }
}