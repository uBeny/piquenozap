package com.piquenozap.piquenozapbackend.controller;

import com.piquenozap.piquenozapbackend.service.BlockService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/block")
public class BlockController {

    @Autowired
    private BlockService blockService;

    @GetMapping("/status/{blockerEmail}/{blockedEmail}")
    public ResponseEntity<?> getBlockStatus(@PathVariable String blockerEmail, @PathVariable String blockedEmail) {
        boolean isBlocked = blockService.isBlocked(blockerEmail, blockedEmail);
        return ResponseEntity.ok(Map.of("isBlocked", isBlocked));
    }

    @PostMapping("/block")
    public ResponseEntity<?> blockUser(@RequestBody Map<String, String> payload) {
        String blockerEmail = payload.get("blockerEmail");
        String blockedEmail = payload.get("blockedEmail");
        blockService.blockUser(blockerEmail, blockedEmail);
        return ResponseEntity.ok(Map.of("message", "Usuário bloqueado com sucesso"));
    }

    @PostMapping("/unblock")
    public ResponseEntity<?> unblockUser(@RequestBody Map<String, String> payload) {
        String blockerEmail = payload.get("blockerEmail");
        String blockedEmail = payload.get("blockedEmail");
        blockService.unblockUser(blockerEmail, blockedEmail);
        return ResponseEntity.ok(Map.of("message", "Usuário desbloqueado com sucesso"));
    }
}