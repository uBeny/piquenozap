package com.piquenozap.piquenozapbackend.controller;

import com.piquenozap.piquenozapbackend.dto.ChatGroupDTO;
import com.piquenozap.piquenozapbackend.model.ChatGroup;
import com.piquenozap.piquenozapbackend.model.User;
import com.piquenozap.piquenozapbackend.repository.ChatGroupRepository;
import com.piquenozap.piquenozapbackend.repository.UserRepository;
import com.piquenozap.piquenozapbackend.service.GroupService; // IMPORTAR O NOVO SERVIÇO
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    @Autowired
    private ChatGroupRepository groupRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private GroupService groupService; // INJETAR O NOVO SERVIÇO

    @PostMapping("/create")
    @Transactional
    public ResponseEntity<?> createGroup(@RequestBody Map<String, String> payload, @AuthenticationPrincipal UserDetails userDetails) {
        String groupName = payload.get("name");
        User creator = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Utilizador criador não encontrado."));

        ChatGroup newGroup = new ChatGroup();
        newGroup.setName(groupName);
        newGroup.setCreator(creator);
        newGroup.getMembers().add(creator);
        groupRepository.save(newGroup);

        return ResponseEntity.ok(new ChatGroupDTO(newGroup));
    }

    // ESTE MÉTODO AGORA É MUITO MAIS SIMPLES E SEGURO
    @GetMapping
    public ResponseEntity<List<ChatGroupDTO>> getUserGroups(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        // Apenas delega a tarefa para o serviço
        List<ChatGroupDTO> groupDTOs = groupService.findGroupsByUserEmail(userDetails.getUsername());
        return ResponseEntity.ok(groupDTOs);
    }

    @GetMapping("/{groupId}")
    @Transactional(readOnly = true)
    public ResponseEntity<ChatGroupDTO> getGroupDetails(@PathVariable Long groupId) {
        ChatGroup group = groupRepository.findById(groupId)
                .orElse(null);

        if (group == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Converte a entidade para um DTO e envia de volta
        return ResponseEntity.ok(new ChatGroupDTO(group));
    }
}