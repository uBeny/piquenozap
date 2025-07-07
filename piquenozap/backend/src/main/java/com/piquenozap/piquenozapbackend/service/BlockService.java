package com.piquenozap.piquenozapbackend.service;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.logging.Logger;

@Service
public class BlockService {

    private static final Logger LOGGER = Logger.getLogger(BlockService.class.getName());

    // Simula um "banco de dados" de bloqueios na memória.
    private final Set<String> blockedPairs = Collections.synchronizedSet(new HashSet<>());

    private String getPair(String userA, String userB) {
        return userA + ":" + userB;
    }

    public boolean isBlocked(String blocker, String blockedUser) {
        return blockedPairs.contains(getPair(blocker, blockedUser));
    }

    public void blockUser(String blocker, String blockedUser) {
        String pair = getPair(blocker, blockedUser);
        blockedPairs.add(pair);
        LOGGER.info(String.format("Executando bloqueio: %s bloqueou %s. Total de bloqueios: %d", blocker, blockedUser, blockedPairs.size()));
    }

    public void unblockUser(String blocker, String blockedUser) {
        String pair = getPair(blocker, blockedUser);
        blockedPairs.remove(pair);
        LOGGER.info(String.format("Executando desbloqueio: %s desbloqueou %s. Total de bloqueios: %d", blocker, blockedUser, blockedPairs.size()));
    }
}