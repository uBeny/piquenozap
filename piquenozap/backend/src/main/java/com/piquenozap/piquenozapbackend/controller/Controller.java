package com.piquenozap.piquenozapbackend.controller;

import com.piquenozap.piquenozapbackend.dto.UserDTO;
import com.piquenozap.piquenozapbackend.model.User;
import com.piquenozap.piquenozapbackend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class Controller {

    private final AuthService authService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public Controller(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        if (email == null || email.isEmpty() || password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email e senha são obrigatórios."));
        }

        try {
            User registeredUser = authService.registerUser(email, password);

            UserDTO newUserDto = new UserDTO(registeredUser.getId(), registeredUser.getEmail());
            messagingTemplate.convertAndSend("/topic/users", newUserDto);

            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Usuário registrado com sucesso!", "userId", registeredUser.getId()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erro ao registrar usuário."));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        if (email == null || email.isEmpty() || password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email e senha são obrigatórios."));
        }

        try {
            Optional<User> userOptional = authService.authenticateUser(email, password);
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                // --- AQUI ESTÁ A CORREÇÃO PRINCIPAL ---
                // Agora estamos retornando o ID e o email do usuário.
                return ResponseEntity.ok(Map.of(
                    "message", "Login bem-sucedido!",
                    "userId", user.getId().toString(),
                    "email", user.getEmail()
                ));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Credenciais inválidas."));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erro ao fazer login."));
        }
    }
}