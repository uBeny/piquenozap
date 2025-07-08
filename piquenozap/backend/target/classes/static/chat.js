'use strict';

// --- SELETORES DO DOM ---
const searchInput = document.querySelector('.search-bar input');
const conversationsList = document.querySelector('.conversations-list');
const chatHeader = document.querySelector('.current-chat-info h2');
const messagesArea = document.querySelector('.messages-area');
const messageInput = document.querySelector('.message-input-area input');
const logoutButton = document.querySelector('.logout-button');
const newGroupButton = document.querySelector('.new-group-button');
const headerButtonsContainer = document.querySelector('.chat-header > div:last-child');

// --- ESTADO DA APLICAÇÃO ---
let stompClient = null;
let currentUser = null;
let activeChatPartner = null;
let allUsers = [];
let localGroups = [];
let processedClientMessageIds = new Set(); // Para deduplicação

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

// --- LÓGICA DE MENSAGENS ---
function sendMessage() {
    const messageContent = messageInput.value.trim();
    if (messageContent && stompClient && activeChatPartner) {
        const chatMessage = {
            sender: currentUser.email,
            recipientEmail: activeChatPartner.email,
            content: messageContent,
            type: 'CHAT',
            clientMessageId: `client-${Date.now()}-${Math.random()}` // ID ÚNICO DO CLIENTE
        };
        stompClient.send("/app/chat.sendPrivateMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);

    // Lógica para evitar duplicatas
    if (message.clientMessageId) {
        if (processedClientMessageIds.has(message.clientMessageId)) {
            const tempElement = document.querySelector(`[data-client-id="${message.clientMessageId}"]`);
            if (tempElement && !tempElement.id && message.id) {
                 tempElement.id = `message-${message.id}`;
            }
            return; // Mensagem já processada
        }
        processedClientMessageIds.add(message.clientMessageId);
    }

    const messageElement = message.id ? document.getElementById(`message-${message.id}`) : null;

    switch (message.type) {
        case 'EDIT':
            if (messageElement) {
                const contentP = messageElement.querySelector('.message-content');
                const editedTag = messageElement.querySelector('.edited-tag');
                if (contentP) {
                    contentP.textContent = message.content;
                    // Adiciona a tag "editado" se ela ainda não existir
                    if (!editedTag) {
                        const newTag = document.createElement('span');
                        newTag.className = 'edited-tag';
                        newTag.textContent = 'editado';
                        messageElement.appendChild(newTag);
                    }
                }
            }
            break;
        case 'DELETE':
            if (messageElement) {
                messageElement.remove();
            }
            break;
        default: // CHAT
            if (messageElement) return;
            
            const isConversationActive = activeChatPartner && (message.sender === activeChatPartner.email || message.recipientEmail === activeChatPartner.email);
            if (isConversationActive || message.sender === currentUser.email) {
                 displayMessage(message);
            }
            break;
    }
}

function displayMessage(message) {
    const isSentByCurrentUser = message.sender === currentUser.email;
    const messageElement = document.createElement('div');
    
    if (message.id) {
        messageElement.id = `message-${message.id}`;
    }
    if (message.clientMessageId) {
        messageElement.dataset.clientId = message.clientMessageId;
    }

    messageElement.classList.add('message-bubble', isSentByCurrentUser ? 'sent' : 'received');

    let messageHTML = '';
    if (!isSentByCurrentUser) {
        messageHTML += `<p class="message-sender">${message.sender}</p>`;
    }
    // Adicionamos uma classe ao parágrafo do conteúdo para selecioná-lo facilmente
    messageHTML += `<p class="message-content">${message.content}</p>`;
    messageElement.innerHTML = messageHTML;

    // Se a mensagem (do histórico) já foi editada, adiciona a tag
    if (message.type === 'EDIT') {
        const newTag = document.createElement('span');
        newTag.className = 'edited-tag';
        newTag.textContent = 'editado';
        messageElement.appendChild(newTag);
    }

    if (isSentByCurrentUser) {
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'message-options';
        optionsContainer.innerHTML = '&#8942;';

        const menu = document.createElement('div');
        menu.className = 'options-menu';
        menu.style.display = 'none';

        const editButton = document.createElement('button');
        editButton.textContent = 'Editar';
        editButton.onclick = () => editMessage(message.id, message.content);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Apagar';
        deleteButton.onclick = () => deleteMessage(message.id);

        menu.appendChild(editButton);
        menu.appendChild(deleteButton);
        optionsContainer.appendChild(menu);
        messageElement.appendChild(optionsContainer);

        optionsContainer.onclick = (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        };

        document.addEventListener('click', () => {
            if (menu.style.display === 'block') menu.style.display = 'none';
        });
    }

    messagesArea.appendChild(messageElement);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function editMessage(messageId, currentContent) {
    const newContent = prompt("Edite sua mensagem:", currentContent);
    if (newContent && newContent.trim() !== '' && newContent !== currentContent) {
        const editedMessage = {
            id: messageId,
            content: newContent,
            sender: currentUser.email
        };
        stompClient.send("/app/chat.editMessage", {}, JSON.stringify(editedMessage));
    }
}

function deleteMessage(messageId) {
    if (confirm("Tem certeza de que deseja apagar esta mensagem?")) {
        const messageToDelete = {
            id: messageId,
            sender: currentUser.email
        };
        stompClient.send("/app/chat.deleteMessage", {}, JSON.stringify(messageToDelete));
    }
}


function onEnterPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}
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
    messagesArea.innerHTML = ''; 
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
         unblockButton.className = 'unblock-button'; 
         unblockButton.onclick = async () => {
             const success = await unblockUser(activeChatPartner.email);
             if (success) {
                await onUserClick(activeChatPartner);
             } else {
                 alert('Falha ao desbloquear o usuário.');
             }
         };
         headerButtonsContainer.prepend(unblockButton);

     } else if (activeChatPartner) {
         const blockButton = document.createElement('button');
         blockButton.textContent = 'Bloquear';
         blockButton.className = 'block-button';

         blockButton.onclick = async () => {
             const success = await blockUser(activeChatPartner.email);
             if (success) {
                await onUserClick(activeChatPartner);
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