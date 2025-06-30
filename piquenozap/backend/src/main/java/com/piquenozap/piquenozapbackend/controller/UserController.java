package com.piquenozap.piquenozapbackend.controller;

import com.piquenozap.piquenozapbackend.dto.UserDTO;
import com.piquenozap.piquenozapbackend.model.ChatMessage;
import com.piquenozap.piquenozapbackend.repository.ChatMessageRepository;
import com.piquenozap.piquenozapbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<UserDTO> users = userRepository.findAll()
                .stream()
                .map(user -> new UserDTO(user.getId(), user.getEmail()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @GetMapping("/messages/{user1Email}/{user2Email}") // Nomes mais genéricos
    public ResponseEntity<List<ChatMessage>> getChatHistory(
            @PathVariable String user1Email,
            @PathVariable String user2Email) {
        
        // Chama o novo método do repositório, que é mais simples e robusto
        List<ChatMessage> messages = chatMessageRepository
                .findConversationByEmails(user1Email, user2Email);
        
        return ResponseEntity.ok(messages);
    }
}