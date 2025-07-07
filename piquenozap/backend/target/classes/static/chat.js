'use strict';

// --- SELETORES DO DOM ---
const searchInput = document.querySelector('.search-bar input');
const conversationsList = document.querySelector('.conversations-list');
const chatHeader = document.querySelector('.current-chat-info h2');
const messagesArea = document.querySelector('.messages-area');
const messageInput = document.querySelector('.message-input-area input');
const logoutButton = document.querySelector('.logout-button');
const newGroupButton = document.querySelector('.new-group-button');
const headerButtonsContainer = document.querySelector('.header-buttons');

// --- ESTADO DA APLICAÇÃO ---
let stompClient = null;
let currentUser = null;
let activeChatPartner = null;
let allUsers = [];
let localGroups = [];

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
    await fetchConversations();

    searchInput.addEventListener('keyup', renderConversations);
    messageInput.addEventListener('keypress', onEnterPress);
    logoutButton.addEventListener('click', logout);
    newGroupButton.addEventListener('click', createNewGroup);
});

function connect() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, onError);
}

function onConnected() {
    console.log('Conectado ao WebSocket!');
    stompClient.subscribe('/user/queue/messages', onMessageReceived);
    stompClient.subscribe('/topic/users', onNewUserRegistered);
}

function onError(error) {
    console.error('Erro no WebSocket:', error);
    alert('Não foi possível conectar ao chat. Tente recarregar a página.');
}

// --- FUNÇÕES DE RENDERIZAÇÃO E UI ---

async function fetchConversations() {
    try {
        const [usersResponse, groupsResponse] = await Promise.all([
            fetch('/api/users'),
            fetch('/api/groups')
        ]);
        if (!usersResponse.ok || !groupsResponse.ok) {
            throw new Error('Falha ao buscar utilizadores ou grupos.');
        }
        allUsers = await usersResponse.json();
        localGroups = await groupsResponse.json();
        renderConversations();
    } catch (error) {
        console.error(error);
        alert('Não foi possível carregar a lista de conversas.');
    }
}
//--- OCULTA USUARIOS ---

function renderConversations() {
    conversationsList.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (searchTerm === '') {
        conversationsList.innerHTML = '<p style="text-align: center; color: #ccc; font-size: 0.9em; padding: 10px;">Digite para pesquisar usuários ou grupos.</p>';
        return;
    }

    const filteredGroups = localGroups.filter(group => group.name.toLowerCase().includes(searchTerm));
    filteredGroups.forEach(group => {
        const el = document.createElement('div');
        el.className = 'conversation-item group-item';
        el.dataset.groupId = group.id;
        el.innerHTML = `<div class="avatar">G</div><span>${group.name}</span>`;
        el.addEventListener('click', () => { window.location.href = `group.html?id=${group.id}`; });
        conversationsList.appendChild(el);
    });

    const filteredUsers = allUsers.filter(user => user.email !== currentUser.email && user.email.toLowerCase().includes(searchTerm));
    filteredUsers.forEach(user => {
        const el = document.createElement('div');
        el.className = 'conversation-item';
        el.dataset.userEmail = user.email;
        if (activeChatPartner && activeChatPartner.email === user.email) {
            el.classList.add('active');
        }
        el.innerHTML = `<div class="avatar"></div><span>${user.email}</span>`;
        el.addEventListener('click', () => onUserClick(user));
        conversationsList.appendChild(el);
    });

    if (filteredUsers.length === 0 && filteredGroups.length === 0) {
        conversationsList.innerHTML = '<p style="text-align: center; color: #ccc; font-size: 0.9em; padding: 10px;">Nenhum resultado encontrado.</p>';
    }
}

async function onUserClick(user) {
    activeChatPartner = user;
    chatHeader.textContent = user.email;
    messagesArea.innerHTML = ''; // Limpa a área de mensagens ao clicar em um novo usuário

    renderConversations();

    const blocked = await isUserBlocked(activeChatPartner.email);
    updateChatUIForBlockedUser(blocked);

    if (!blocked) {
        try {
            const response = await fetch(`/api/messages/${currentUser.email}/${activeChatPartner.email}`);
            if (!response.ok) throw new Error('Falha ao buscar histórico de mensagens.');
            const messageHistory = await response.json();
            messageHistory.forEach(message => displayMessage(message, message.sender === currentUser.email));
        } catch (error) {
            console.error(error);
            alert('Não foi possível carregar o histórico da conversa.');
        }
    }
    messageInput.focus();
}

// --- LÓGICA DE BLOQUEIO E DESBLOQUEIO ---

async function isUserBlocked(userEmail) {
    try {
        const response = await fetch(`/api/block/status/${currentUser.email}/${userEmail}`);
        if (response.ok) {
            const data = await response.json();
            return data.isBlocked;
        }
    } catch (e) {
        console.error("Erro ao verificar status de bloqueio:", e);
    }
    return false;
}

async function blockUser(userEmail) {
    try {
        const response = await fetch(`/api/block/block`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                blockerEmail: currentUser.email,
                blockedEmail: userEmail
            })
        });
        return response.ok;
    } catch (e) {
        console.error("Erro ao bloquear usuário:", e);
        return false;
    }
}

async function unblockUser(userEmail) {
    try {
        const response = await fetch(`/api/block/unblock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                blockerEmail: currentUser.email,
                blockedEmail: userEmail
            })
        });
        return response.ok;
    } catch (e) {
        console.error("Erro ao desbloquear usuário:", e);
        return false;
    }
}

function updateChatUIForBlockedUser(blocked) {
     // Limpa botões antigos para evitar duplicação
     const existingBlockButton = headerButtonsContainer.querySelector('.block-button');
     const existingUnblockButton = headerButtonsContainer.querySelector('.unblock-button');
     if (existingBlockButton) existingBlockButton.remove();
     if (existingUnblockButton) existingUnblockButton.remove();

     messageInput.disabled = false;
     messageInput.placeholder = "DIGITE AQUI SUA MENSAGEM";

     if (blocked) {
         messageInput.disabled = true;
         messageInput.placeholder = "Usuário bloqueado";
         messagesArea.innerHTML = `<div class="blocked-message-indicator">Você bloqueou este usuário. Desbloqueie para poder enviar mensagens.</div>`;

         const unblockButton = document.createElement('button');
         unblockButton.textContent = 'Desbloquear';
         unblockButton.className = 'unblock-button'; // Garante que a classe de estilo seja aplicada

         unblockButton.onclick = async () => {
             const success = await unblockUser(activeChatPartner.email);
             if (success) {
                 onUserClick(activeChatPartner); // Recarrega a conversa
             } else {
                 alert('Falha ao desbloquear o usuário.');
             }
         };
         headerButtonsContainer.prepend(unblockButton);

     } else {
         // Se não estiver bloqueado, mostra o botão para bloquear
         const blockButton = document.createElement('button');
         blockButton.textContent = 'Bloquear';
         blockButton.className = 'block-button';

         blockButton.onclick = async () => {
             const success = await blockUser(activeChatPartner.email);
             if (success) {
                 onUserClick(activeChatPartner); // Recarrega a conversa
             } else {
                 alert('Falha ao bloquear o usuário.');
             }
         };
         headerButtonsContainer.prepend(blockButton);
     }
 }


function onNewUserRegistered(payload) {
    const newUser = JSON.parse(payload.body);
    if (!allUsers.some(user => user.id === newUser.id)) {
        allUsers.push(newUser);
        renderConversations();
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
    if (activeChatPartner && message.sender === activeChatPartner.email) {
        displayMessage(message, false);
    } else {
        alert(`Nova mensagem de: ${message.sender}`);
    }
}

function displayMessage(message, isSentByCurrentUser) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message-bubble', isSentByCurrentUser ? 'sent' : 'received');
    let messageHTML = '';
    if (!isSentByCurrentUser) {
        messageHTML += `<p class="message-sender">${message.sender}</p>`;
    }
    messageHTML += `<p>${message.content}</p>`;
    messageElement.innerHTML = messageHTML;
    messagesArea.appendChild(messageElement);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function logout() {
    localStorage.clear();
    if (stompClient) stompClient.disconnect();
    window.location.href = 'login.html';
}

async function createNewGroup() {
    const groupName = prompt("Por favor, digite o nome do novo grupo:");
    if (groupName && groupName.trim() !== '') {
        try {
            const response = await fetch('/api/groups/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: groupName })
            });
            if (!response.ok) throw new Error('Falha ao criar o grupo.');
            const newGroup = await response.json();
            alert(`Grupo "${newGroup.name}" criado com sucesso!`);
            localGroups.push(newGroup);
            renderConversations();
        } catch (error) {
            console.error('Erro ao criar grupo:', error);
            alert('Erro ao criar grupo.');
        }
    }
}