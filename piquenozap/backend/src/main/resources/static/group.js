'use strict';

// --- SELETORES DO DOM ---
const conversationsList = document.querySelector('.conversations-list');
const chatHeader = document.querySelector('.current-chat-info h2');
const messagesArea = document.querySelector('.messages-area');
const messageInput = document.querySelector('.message-input-area input');
const logoutButton = document.querySelector('.logout-button');

// --- ESTADO DA APLICAÇÃO ---
let stompClient = null;
let currentUser = null;
let groupId = null;
let localUsers = [];
let localGroups = [];

// --- FUNÇÕES DE INICIALIZAÇÃO ---

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    groupId = params.get('id');

    currentUser = {
        id: localStorage.getItem('userId'),
        email: localStorage.getItem('userEmail')
    };

    if (!groupId || !currentUser.id) {
        alert('ID do grupo ou utilizador não encontrado. A redirecionar...');
        window.location.href = 'chat.html';
        return;
    }

    // Busca todas as conversas E os detalhes do grupo atual
    await Promise.all([
        fetchAndRenderConversations(),
        fetchCurrentGroupDetails() 
    ]);

    connect();

    messageInput.addEventListener('keypress', onEnterPress);
    logoutButton.addEventListener('click', logout);
});

// Busca os detalhes do grupo atual e atualiza o cabeçalho
async function fetchCurrentGroupDetails() {
    try {
        const response = await fetch(`/api/groups/${groupId}`);
        if (!response.ok) throw new Error('Grupo não encontrado');
        const groupDetails = await response.json();
        chatHeader.textContent = groupDetails.name;
    } catch (error) {
        console.error(error);
        chatHeader.textContent = `Grupo ${groupId}`; // Fallback
    }
}

// Busca utilizadores e grupos para preencher a barra lateral
async function fetchAndRenderConversations() {
    try {
        const [usersResponse, groupsResponse] = await Promise.all([
            fetch('/api/users'),
            fetch('/api/groups')
        ]);

        if (!usersResponse.ok || !groupsResponse.ok) {
            throw new Error('Falha ao buscar utilizadores ou grupos.');
        }

        localUsers = await usersResponse.json();
        localGroups = await groupsResponse.json();

        renderConversations(localUsers, localGroups);

    } catch (error) {
        console.error(error);
    }
}

// Renderiza a barra lateral (esta função é idêntica à do chat.js)
function renderConversations(users, groups) {
    conversationsList.innerHTML = '';

    groups.forEach(group => {
        const el = document.createElement('div');
        el.classList.add('conversation-item', 'group-item');
        el.dataset.groupId = group.id;

        // Marca o grupo atual como ativo
        if (group.id == groupId) {
            el.classList.add('active');
        }

        const avatar = document.createElement('div');
        avatar.classList.add('avatar');
        avatar.textContent = 'G';
        el.appendChild(avatar);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = group.name;
        el.appendChild(nameSpan);

        el.addEventListener('click', () => {
            if (group.id != groupId) { // Só recarrega se for um grupo diferente
                window.location.href = `group.html?id=${group.id}`;
            }
        });
        conversationsList.appendChild(el);
    });

    users.filter(user => user.email !== currentUser.email).forEach(user => {
        const el = document.createElement('div');
        el.classList.add('conversation-item');
        el.dataset.userEmail = user.email;
        
        const avatar = document.createElement('div');
        avatar.classList.add('avatar');
        el.appendChild(avatar);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = user.email;
        el.appendChild(nameSpan);

        // Ao clicar num utilizador, volta para a página principal de chat
        el.addEventListener('click', () => {
            window.location.href = `chat.html`; 
        });
        conversationsList.appendChild(el);
    });
}

// --- Funções de WebSocket e Mensagens (permanecem as mesmas) ---

function connect() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, onError);
}

function onConnected() {
    stompClient.subscribe(`/topic/group/${groupId}`, onMessageReceived);
}

function onError(error) {
    console.error('Erro no WebSocket:', error);
}

function sendMessage() {
    const messageContent = messageInput.value.trim();
    if (messageContent && stompClient) {
        const chatMessage = {
            sender: currentUser.email,
            content: messageContent,
            groupId: groupId,
            type: 'GROUP_CHAT'
        };
        stompClient.send("/app/chat.sendGroupMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
}

function onEnterPress(event) {
    if (event.key === 'Enter') sendMessage();
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    displayMessage(message, message.sender === currentUser.email);
}

function displayMessage(message, isSentByCurrentUser) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-bubble', isSentByCurrentUser ? 'sent' : 'received');

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
    localStorage.clear();
    if (stompClient) stompClient.disconnect();
    window.location.href = 'login.html';
}