package com.piquenozap.piquenozapbackend.service;

import com.piquenozap.piquenozapbackend.model.User;
import com.piquenozap.piquenozapbackend.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList; 

@Service

public class AuthService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado com o email: " + email));

        return new org.springframework.security.core.userdetails.User(
            user.getEmail(),
            user.getPassword(),
            new ArrayList<>() // Lista de autoridades/roles (pode ser vazia por enquanto)
        );
    }

    // O método de registro permanece o mesmo
    public User registerUser(String email, String rawPassword) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email já registrado!");
        }
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setPassword(passwordEncoder.encode(rawPassword));
        return userRepository.save(newUser);
    }

    
}