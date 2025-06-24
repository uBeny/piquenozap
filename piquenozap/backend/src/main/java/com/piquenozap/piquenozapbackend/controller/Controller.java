package com.piquenozap.piquenozapbackend.controller;

import com.piquenozap.piquenozapbackend.model.User;
import com.piquenozap.piquenozapbackend.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class Controller {

    private final AuthService authService;

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

        if (email == null || email.isEmpty() || password == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email e senha são obrigatórios."));
        }

        try {
            if (authService.authenticateUser(email, password).isPresent()) {
                return ResponseEntity.ok(Map.of("message", "Login bem-sucedido!"));
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Credenciais inválidas."));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", "Erro ao fazer login."));
        }
    }
}
