package com.piquenozap.piquenozapbackend.dto;

import com.piquenozap.piquenozapbackend.model.ChatGroup;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ChatGroupDTO {

    private Long id;
    private String name;
    // Em vez de um objeto UserDTO, usamos campos simples
    private Long creatorId;
    private String creatorEmail;

    // Construtor que converte a entidade para este DTO simplificado
    public ChatGroupDTO(ChatGroup group) {
        this.id = group.getId();
        this.name = group.getName();
        // Atribui diretamente os dados do criador
        this.creatorId = group.getCreator().getId();
        this.creatorEmail = group.getCreator().getEmail();
    }
}