package com.piquenozap.piquenozapbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

// DTO para transferir dados do usuário de forma segura, sem a senha.
@Data
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String email;
}