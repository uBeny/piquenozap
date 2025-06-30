package com.piquenozap.piquenozapbackend.service;

import com.piquenozap.piquenozapbackend.dto.ChatGroupDTO;
import com.piquenozap.piquenozapbackend.model.User;
import com.piquenozap.piquenozapbackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GroupService {

    @Autowired
    private UserRepository userRepository;

    // Este método é a chave. Ele garante que tudo acontece dentro de uma
    // transação segura, prevenindo erros de "lazy loading".
    @Transactional(readOnly = true)
    public List<ChatGroupDTO> findGroupsByUserEmail(String email) {
        User user = userRepository.findByEmailWithGroups(email)
                .orElse(null);

        if (user == null || user.getGroups() == null) {
            return Collections.emptyList(); // Devolve uma lista vazia se não encontrar nada
        }

        // Converte a lista de entidades para uma lista de DTOs de forma manual e segura.
        return user.getGroups().stream()
                   .map(ChatGroupDTO::new)
                   .collect(Collectors.toList());
    }
}