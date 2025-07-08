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
let processedClientMessageIds = new Set(); // Para deduplicação

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
    
    messagesArea.innerHTML = '';
    await Promise.all([
        fetchAndRenderConversations(),
        fetchCurrentGroupDetails() 
    ]);

    connect();

    messageInput.addEventListener('keypress', onEnterPress);
    logoutButton.addEventListener('click', logout);
});

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

// --- LÓGICA DE MENSAGENS ---
function sendMessage() {
    const messageContent = messageInput.value.trim();
    if (messageContent && stompClient) {
        const chatMessage = {
            sender: currentUser.email,
            content: messageContent,
            groupId: groupId,
            type: 'GROUP_CHAT',
            clientMessageId: `client-${Date.now()}-${Math.random()}` // ID ÚNICO DO CLIENTE
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

    if (message.clientMessageId) {
        if (processedClientMessageIds.has(message.clientMessageId)) {
            const tempElement = document.querySelector(`[data-client-id="${message.clientMessageId}"]`);
            if (tempElement && !tempElement.id && message.id) {
                 tempElement.id = `message-${message.id}`;
            }
            return; 
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
        default: // GROUP_CHAT
            if (messageElement) return;
            if (message.groupId == groupId) {
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
    messageHTML += `<p class="message-content">${message.content}</p>`;
    messageElement.innerHTML = messageHTML;

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


// --- O restante das funções (fetchCurrentGroupDetails, fetchAndRenderConversations, etc.) permanece o mesmo ---
async function fetchCurrentGroupDetails() {
    try {
        const response = await fetch(`/api/groups/${groupId}`);
        if (!response.ok) throw new Error('Grupo não encontrado');
        const groupDetails = await response.json();
        chatHeader.textContent = groupDetails.name;
    } catch (error) {
        console.error(error);
        chatHeader.textContent = `Grupo ${groupId}`; 
    }
}
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
function renderConversations(users, groups) {
    conversationsList.innerHTML = '';

    groups.forEach(group => {
        const el = document.createElement('div');
        el.classList.add('conversation-item', 'group-item');
        el.dataset.groupId = group.id;

        if (group.id == groupId) {
            el.classList.add('active');
        }

        el.innerHTML = `<div class="avatar">G</div><span>${group.name}</span>`;
        el.addEventListener('click', () => {
            if (group.id != groupId) {
                window.location.href = `group.html?id=${group.id}`;
            }
        });
        conversationsList.appendChild(el);
    });

    users.filter(user => user.email !== currentUser.email).forEach(user => {
        const el = document.createElement('div');
        el.classList.add('conversation-item');
        el.dataset.userEmail = user.email;
        el.innerHTML = `<div class="avatar"></div><span>${user.email}</span>`;
        el.addEventListener('click', () => {
            window.location.href = `chat.html`; 
        });
        conversationsList.appendChild(el);
    });
}
function logout() {
    localStorage.clear();
    if (stompClient) stompClient.disconnect();
    window.location.href = 'login.html';
}