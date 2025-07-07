'use strict';

// --- SELETORES DO DOM ---
const searchInput = document.querySelector('.search-bar input');
const conversationsList = document.querySelector('.conversations-list');
const chatHeader = document.querySelector('.current-chat-info h2');
const messagesArea = document.querySelector('.messages-area');
const messageInput = document.querySelector('.message-input-area input');
const logoutButton = document.querySelector('.logout-button');
const newGroupButton = document.querySelector('.new-group-button');

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
    await fetchAndRenderConversations();
    
    searchInput.addEventListener('keyup', fetchAndRenderConversations);
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

async function fetchAndRenderConversations() {
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

        renderConversations(allUsers, localGroups);

    } catch (error) {
        console.error(error);
        alert('Não foi possível carregar a lista de conversas.');
    }
}

// ESTA É A VERSÃO COM A LÓGICA DE OCULTAR ATÉ PESQUISAR
function renderConversations(users = [], groups = []) {
    conversationsList.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();

    // Se a barra de pesquisa estiver vazia, exibe a mensagem padrão e para a execução.
    if (searchTerm === '') {
        conversationsList.innerHTML = '<p style="text-align: center; color: #ccc; font-size: 0.9em; padding: 10px;">Pesquise usuários ou grupos pelo nome</p>';
        return;
    }

    // Filtra e renderiza os GRUPOS que correspondem ao termo de pesquisa
    const filteredGroups = groups.filter(group => group.name.toLowerCase().includes(searchTerm));
    filteredGroups.forEach(group => {
        const conversationElement = document.createElement('div');
        conversationElement.classList.add('conversation-item', 'group-item');
        conversationElement.dataset.groupId = group.id;
        conversationElement.dataset.groupName = group.name;

        const avatar = document.createElement('div');
        avatar.classList.add('avatar');
        avatar.textContent = 'G';
        conversationElement.appendChild(avatar);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = group.name;
        conversationElement.appendChild(nameSpan);

        conversationElement.addEventListener('click', () => {
            window.location.href = `group.html?id=${group.id}`;
        });

        conversationsList.appendChild(conversationElement);
    });

    // Filtra e renderiza os UTILIZADORES que correspondem ao termo de pesquisa
    const filteredUsers = users
        .filter(user => user.email !== currentUser.email)
        .filter(user => user.email.toLowerCase().includes(searchTerm));
        
    filteredUsers.forEach(user => {
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

    // Se, após a filtragem, nenhum resultado for encontrado, exibe a mensagem apropriada.
    if (filteredGroups.length === 0 && filteredUsers.length === 0) {
        conversationsList.innerHTML = '<p style="text-align: center; color: #ccc; font-size: 0.9em; padding: 10px;">Nenhum utilizador ou grupo encontrado.</p>';
    }
}


async function onUserClick(user) {
    activeChatPartner = user;
    chatHeader.textContent = user.email; // LINHA ADICIONADA AQUI

    // 1. Redesenha a lista de conversas, marcando a conversa atual como ativa.
    renderConversations(localUsers, localGroups); 
    
    // 2. Limpa a área de mensagens antigas.
    messagesArea.innerHTML = '';

    // 3. Busca e exibe o histórico de mensagens para esta conversa privada.
    try {
        const response = await fetch(`/api/messages/${currentUser.email}/${activeChatPartner.email}`);
        if (!response.ok) {
            throw new Error('Falha ao buscar histórico de mensagens.');
        }
        const messageHistory = await response.json();
        messageHistory.forEach(message => {
            const isSentByCurrentUser = message.sender === currentUser.email;
            displayMessage(message, isSentByCurrentUser);
        });
    } catch (error) {
        console.error(error);
        alert('Não foi possível carregar o histórico da conversa.');
    }

    messageInput.focus();
}

function onNewUserRegistered(payload) {
    const newUser = JSON.parse(payload.body);
    if (!allUsers.some(user => user.id === newUser.id)) {
        allUsers.push(newUser);
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

async function createNewGroup() {
    const groupName = prompt("Por favor, digite o nome do novo grupo:");

    if (groupName && groupName.trim() !== '') {
        try {
            const response = await fetch('/api/groups/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: groupName })
            });

            if (!response.ok) {
                throw new Error('Falha ao criar o grupo.');
            }

            const newGroup = await response.json();
            alert(`Grupo "${newGroup.name}" criado com sucesso!`);
            
            // Re-busca os dados para garantir que a lista local esteja atualizada
            await fetchAndRenderConversations();

        } catch (error) {
            console.error('Erro ao criar grupo:', error);
            alert('Erro ao criar grupo.');
        }
    }
}