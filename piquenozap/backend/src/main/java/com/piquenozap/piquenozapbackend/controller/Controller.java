package com.piquenozap.piquenozapbackend.controller;

import com.piquenozap.piquenozapbackend.dto.UserDTO;
import com.piquenozap.piquenozapbackend.model.User;
import com.piquenozap.piquenozapbackend.repository.UserRepository;
import com.piquenozap.piquenozapbackend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class Controller {

    private final AuthService authService;
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public Controller(AuthService authService, AuthenticationManager authenticationManager, UserRepository userRepository) {
        this.authService = authService;
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
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
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String email = payload.get("email");
        String password = payload.get("password");

        try {
            Authentication authenticationRequest = new UsernamePasswordAuthenticationToken(email, password);
            Authentication authenticationResponse = this.authenticationManager.authenticate(authenticationRequest);

            SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
            securityContext.setAuthentication(authenticationResponse);
            SecurityContextHolder.setContext(securityContext);

            HttpSession session = request.getSession(true);
            session.setAttribute("SPRING_SECURITY_CONTEXT", securityContext);

            User user = userRepository.findByEmail(email).get();
            return ResponseEntity.ok(Map.of(
                "message", "Login bem-sucedido!",
                "userId", user.getId().toString(),
                "email", user.getEmail()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Credenciais inválidas."));
        }
    }
}