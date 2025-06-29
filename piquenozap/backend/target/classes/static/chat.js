'use strict';

// --- SELETORES DO DOM ---
const searchInput = document.querySelector('.search-bar input');
const conversationsList = document.querySelector('.conversations-list');
const chatHeader = document.querySelector('.current-chat-info h2');
const messagesArea = document.querySelector('.messages-area');
const messageInput = document.querySelector('.message-input-area input');
const logoutButton = document.querySelector('.logout-button');

// --- ESTADO DA APLICAÇÃO ---
let stompClient = null;
let currentUser = null; 
let activeChatPartner = null; 
let allUsers = []; 

// --- FUNÇÕES DE CONEXÃO E INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = {
        id: localStorage.getItem('userId'),
        email: localStorage.getItem('userEmail')
    };

    if (!currentUser.id || !currentUser.email) {
        alert('Usuário não identificado. Redirecionando para o login.');
        window.location.href = 'login.html';
        return;
    }

    connect();
    await fetchAndRenderUsers();
    
    searchInput.addEventListener('keyup', renderUsers);
    messageInput.addEventListener('keypress', onEnterPress);
    logoutButton.addEventListener('click', logout);
});

function connect() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, onError);
}

function onConnected() {
    console.log('Conectado ao WebSocket!');
    
    // --- CORREÇÃO APLICADA AQUI ---
    // Inscreve-se no destino de usuário GENÉRICO. 
    // O Spring irá resolver isso para uma fila única e privada para este usuário.
    stompClient.subscribe('/user/queue/messages', onMessageReceived);
    // --- FIM DA CORREÇÃO ---

    // Inscrição no tópico PÚBLICO de atualização de usuários (está correto)
    stompClient.subscribe('/topic/users', onNewUserRegistered);
}

function onError(error) {
    console.error('Erro no WebSocket:', error);
    alert('Não foi possível conectar ao chat. Tente recarregar a página.');
}

// --- FUNÇÕES DE RENDERIZAÇÃO E UI ---

async function fetchAndRenderUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Falha ao buscar usuários.');
        allUsers = await response.json();
        renderUsers();
    } catch (error) {
        console.error(error);
        alert('Não foi possível carregar a lista de usuários.');
    }
}

function renderUsers() {
    conversationsList.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();

    const filteredUsers = allUsers.filter(user => user.email !== currentUser.email);
    
    if (filteredUsers.length === 0 && searchTerm === '') {
        conversationsList.innerHTML = '<p style="text-align: center; color: #ccc; font-size: 0.9em; padding: 10px;">Nenhum outro usuário encontrado. Cadastre uma nova conta para testar o chat.</p>';
        return;
    }

    filteredUsers
        .filter(user => user.email.toLowerCase().includes(searchTerm))
        .forEach(user => {
            const userElement = document.createElement('div');
            userElement.classList.add('conversation-item');
            userElement.dataset.userId = user.id;
            userElement.dataset.userEmail = user.email;

            const avatar = document.createElement('div');
            avatar.classList.add('avatar');
            userElement.appendChild(avatar);

            const nameSpan = document.createElement('span');
            nameSpan.textContent = user.email;
            userElement.appendChild(nameSpan);

            userElement.addEventListener('click', () => onUserClick(user));
            conversationsList.appendChild(userElement);
        });
}

function onUserClick(user) {
    activeChatPartner = user;
    chatHeader.textContent = user.email;
    messagesArea.innerHTML = '';
    messageInput.focus();
}

function onNewUserRegistered(payload) {
    const newUser = JSON.parse(payload.body);
    if (!allUsers.some(user => user.id === newUser.id)) {
        allUsers.push(newUser);
        renderUsers();
        console.log('Novo usuário adicionado à lista:', newUser);
    }
}

function onEnterPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function sendMessage() {
    const messageContent = messageInput.value.trim();

    if (messageContent && stompClient && activeChatPartner) {
        const chatMessage = {
            sender: currentUser.email,
            recipientEmail: activeChatPartner.email,
            content: messageContent,
            type: 'CHAT'
        };

        stompClient.send("/app/chat.sendPrivateMessage", {}, JSON.stringify(chatMessage));
        
        displayMessage(chatMessage, true);
        messageInput.value = '';
    }
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    
    // Verifica se a mensagem é do parceiro de chat atualmente ativo
    if (activeChatPartner && message.sender === activeChatPartner.email) {
        displayMessage(message, false);
    } else {
        // Se a mensagem for de outro usuário, mostra um alerta (ou uma notificação no futuro)
        alert(`Nova mensagem de: ${message.sender}`);
    }
}

function displayMessage(message, isSentByCurrentUser) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-bubble');
    
    const alignment = isSentByCurrentUser ? 'sent' : 'received';
    messageElement.classList.add(alignment);
    
    if (!isSentByCurrentUser) {
        const senderElement = document.createElement('p');
        senderElement.classList.add('message-sender');
        senderElement.textContent = message.sender;
        messageElement.appendChild(senderElement);
    }
    
    const contentElement = document.createElement('p');
    contentElement.textContent = message.content;
    messageElement.appendChild(contentElement);

    messagesArea.appendChild(messageElement);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function logout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    if (stompClient) {
        stompClient.disconnect();
    }
    window.location.href = 'login.html';
}