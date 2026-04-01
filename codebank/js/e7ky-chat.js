/**
 * e7ky-chat.js - E7ki! chat functionality for CodeBank
 */

export function initChat() {
    let currentUser = null;
    let currentChat = null;
    let contacts = [];

    const contactsBtn = document.getElementById('e7ky-contacts-btn');
    const contactsSidebar = document.getElementById('e7ky-contacts-sidebar');
    const contactsList = document.getElementById('e7ky-contacts-list');
    const messagesContainer = document.getElementById('e7ky-messages');
    const messageInput = document.getElementById('e7ky-message-input');
    const sendBtn = document.getElementById('e7ky-send-btn');
    const emojiBtn = document.getElementById('e7ky-emoji-btn');
    const fileBtn = document.getElementById('e7ky-file-btn');
    const callBtn = document.getElementById('e7ky-call-btn');
    const videoBtn = document.getElementById('e7ky-video-btn');
    const currentChatSpan = document.getElementById('e7ky-current-chat');

    function setupEventListeners() {
        contactsBtn?.addEventListener('click', toggleContacts);
        sendBtn?.addEventListener('click', sendMessage);
        messageInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
        emojiBtn?.addEventListener('click', () => window.showToast?.('Emoji picker not implemented', 'info'));
        fileBtn?.addEventListener('click', () => window.showToast?.('File sharing not implemented', 'info'));
        callBtn?.addEventListener('click', () => currentChat && window.showToast?.(`Starting call with ${currentChat.name}`, 'info'));
        videoBtn?.addEventListener('click', () => currentChat && window.showToast?.(`Starting video with ${currentChat.name}`, 'info'));
    }

    function toggleContacts() {
        if (contactsSidebar.style.display === 'block') {
            contactsSidebar.style.display = 'none';
        } else {
            contactsSidebar.style.display = 'block';
            loadContacts();
        }
    }

    function loadContacts() {
        if (!contactsList) return;
        contactsList.innerHTML = '';
        contacts.forEach(contact => {
            const contactDiv = document.createElement('div');
            contactDiv.className = 'e7ky-contact';
            contactDiv.innerHTML = `<div style="font-weight: 600;">${contact.name}</div><div style="font-size: 0.8em; color: #666;">${contact.email}</div>`;
            contactDiv.addEventListener('click', () => selectContact(contact));
            contactsList.appendChild(contactDiv);
        });
    }

    function selectContact(contact) {
        currentChat = contact;
        if (currentChatSpan) currentChatSpan.textContent = `Chatting with ${contact.name}`;
        loadMessages();
        contactsSidebar.style.display = 'none';
    }

    function loadMessages() {
        if (!currentChat || !messagesContainer) return;
        messagesContainer.innerHTML = '';
        const mockMessages = [
            { id: '1', text: 'Hello!', sender: 'other', timestamp: new Date() },
            { id: '2', text: 'Hi there!', sender: 'me', timestamp: new Date() }
        ];
        mockMessages.forEach(msg => displayMessage(msg));
    }

    function displayMessage(msg) {
        if (!messagesContainer) return;
        const msgDiv = document.createElement('div');
        msgDiv.className = `e7ky-message ${msg.sender === 'me' ? 'sent' : 'received'}`;
        msgDiv.innerHTML = `<div>${msg.text}</div><div class="e7ky-message-status">${msg.timestamp.toLocaleTimeString()}</div>`;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || !currentChat) return;
        displayMessage({ id: Date.now().toString(), text, sender: 'me', timestamp: new Date() });
        messageInput.value = '';
    }

    setupEventListeners();
    contacts = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
        { id: '3', name: 'Charlie', email: 'charlie@example.com' }
    ];
    loadContacts();
    console.log('💬 E7ki! Chat initialized');
}
