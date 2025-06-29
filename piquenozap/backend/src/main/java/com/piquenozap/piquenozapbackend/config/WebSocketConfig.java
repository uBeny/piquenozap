package com.piquenozap.piquenozapbackend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // O endpoint para os clientes se conectarem
        registry.addEndpoint("/ws")
                .setAllowedOrigins("http://localhost:8080") // Garante o CORS aqui também
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Prefixo para os destinos que o cliente envia mensagens (ex: /app/chat.sendPrivateMessage)
        registry.setApplicationDestinationPrefixes("/app");
        // Prefixo para os brokers que distribuem as mensagens
        // /queue é usado para mensagens privadas (1-para-1)
        // /topic é usado para mensagens públicas (broadcast)
        registry.enableSimpleBroker("/queue", "/topic");
        // Prefixo para destinações de usuário, usado pelo `convertAndSendToUser`
        registry.setUserDestinationPrefix("/user");
    }

    // --- ESTA É A PARTE MAIS IMPORTANTE DA CORREÇÃO ---
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @SuppressWarnings("null")
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor =
                        MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                // Quando um cliente envia um frame de COMEXÃO (CONNECT)
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    // Busca a autenticação que foi estabelecida durante o login HTTP
                    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                    // Associa essa autenticação com a sessão do WebSocket
                    if (authentication != null) {
                        accessor.setUser(authentication);
                    }
                }
                return message;
            }
        });
    }
}