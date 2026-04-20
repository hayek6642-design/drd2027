/**
 * AI Chat - CodeBank Service
 * AI-powered chat and conversation engine
 */

class AIChat {
    constructor() {
        this.threads = this.initializeThreads();
        this.currentThreadId = null;
        this.messages = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderThreads();
    }

    setupEventListeners() {
        document.getElementById('newChatBtn').addEventListener('click', () => this.startNewChat());
        document.getElementById('startNewChatBtn').addEventListener('click', () => this.startNewChat());
        
        document.getElementById('chatForm').addEventListener('submit', (e) => this.handleSendMessage(e));
        
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.useQuickPrompt(e.target.dataset.prompt));
        });

        document.getElementById('infoBtn').addEventListener('click', () => this.showInfo());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteThread());
    }

    initializeThreads() {
        return [
            { id: 1, title: 'Project Ideas', messages: 3, timestamp: 'Today', preview: 'Let me help you brainstorm...' },
            { id: 2, title: 'Code Review', messages: 5, timestamp: 'Yesterday', preview: 'Here\'s my analysis of your code...' },
            { id: 3, title: 'Learning Python', messages: 8, timestamp: '2 days ago', preview: 'Python is a versatile language...' }
        ];
    }

    renderThreads() {
        const container = document.getElementById('threadsContainer');
        container.innerHTML = this.threads.map(thread => `
            <div class="thread-item" data-id="${thread.id}">
                <div class="thread-content">
                    <div class="thread-title">${thread.title}</div>
                    <div class="thread-preview">${thread.preview}</div>
                    <div class="thread-date">${thread.timestamp}</div>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.thread-item').forEach(item => {
            item.addEventListener('click', (e) => this.selectThread(parseInt(e.currentTarget.dataset.id)));
        });
    }

    startNewChat() {
        const newThreadId = Math.max(...this.threads.map(t => t.id), 0) + 1;
        
        this.threads.unshift({
            id: newThreadId,
            title: 'New Conversation',
            messages: 0,
            timestamp: 'Now',
            preview: 'Start typing to begin...'
        });

        this.messages[newThreadId] = [];
        this.renderThreads();
        this.selectThread(newThreadId);
    }

    selectThread(threadId) {
        this.currentThreadId = threadId;
        const thread = this.threads.find(t => t.id === threadId);

        // Update UI
        document.getElementById('noChatState').style.display = 'none';
        document.getElementById('activeChat').style.display = 'flex';
        
        document.getElementById('chatTitle').textContent = thread.title;
        document.getElementById('chatSubtitle').textContent = `${thread.messages} messages`;

        // Mark thread as active
        document.querySelectorAll('.thread-item').forEach(item => {
            item.classList.remove('active');
            if (parseInt(item.dataset.id) === threadId) {
                item.classList.add('active');
            }
        });

        this.renderMessages();
    }

    renderMessages() {
        const container = document.getElementById('messagesContainer');
        const threadMessages = this.messages[this.currentThreadId] || [];

        if (threadMessages.length === 0) {
            container.innerHTML = '<div class="empty-messages">No messages yet. Start typing!</div>';
            return;
        }

        container.innerHTML = threadMessages.map(msg => `
            <div class="message ${msg.role}">
                <div class="message-bubble">
                    ${msg.role === 'ai' ? '<span class="ai-badge">🤖</span>' : ''}
                    <div class="message-text">${msg.content}</div>
                    <div class="message-time">${msg.time}</div>
                </div>
            </div>
        `).join('');

        container.scrollTop = container.scrollHeight;
    }

    handleSendMessage(event) {
        event.preventDefault();
        
        const input = document.getElementById('messageInput');
        const content = input.value.trim();

        if (!content) return;

        if (!this.messages[this.currentThreadId]) {
            this.messages[this.currentThreadId] = [];
        }

        // Add user message
        this.messages[this.currentThreadId].push({
            role: 'user',
            content: content,
            time: this.getCurrentTime()
        });

        input.value = '';
        this.renderMessages();

        // Simulate AI response
        setTimeout(() => this.addAIResponse(content), 1000);
    }

    addAIResponse(userMessage) {
        const responses = {
            'help': 'I\'d be happy to help! Can you provide more details about what you need assistance with?',
            'explain': 'Sure! Let me break that down for you in simple terms...',
            'write': 'I can help you write that. Here\'s a template to get started...',
            'code': 'Here\'s a code example for you:\n\n```\nfunction example() {\n  return "Hello World";\n}\n```',
            'default': 'That\'s an interesting question! Let me think about that... ' + userMessage.substring(0, 30) + '... Thank you for the question!'
        };

        let response = responses.default;
        const firstWord = userMessage.split(' ')[0].toLowerCase();
        
        if (responses[firstWord]) {
            response = responses[firstWord];
        }

        this.messages[this.currentThreadId].push({
            role: 'ai',
            content: response,
            time: this.getCurrentTime()
        });

        this.renderMessages();

        // Update thread message count
        const thread = this.threads.find(t => t.id === this.currentThreadId);
        thread.messages = this.messages[this.currentThreadId].length;
        thread.preview = response.substring(0, 50) + '...';
        this.renderThreads();
        
        // Re-select current thread to keep it active
        const threadItem = document.querySelector(`[data-id="${this.currentThreadId}"]`);
        if (threadItem) {
            threadItem.classList.add('active');
        }
    }

    useQuickPrompt(prompt) {
        const input = document.getElementById('messageInput');
        input.value = prompt;
        input.focus();
    }

    showInfo() {
        alert(`Chat Info:\nThread: ${this.threads.find(t => t.id === this.currentThreadId).title}\nMessages: ${this.messages[this.currentThreadId].length}`);
    }

    deleteThread() {
        if (!confirm('Delete this conversation?')) return;

        this.threads = this.threads.filter(t => t.id !== this.currentThreadId);
        delete this.messages[this.currentThreadId];
        
        this.currentThreadId = null;
        this.renderThreads();
        
        document.getElementById('noChatState').style.display = 'flex';
        document.getElementById('activeChat').style.display = 'none';
    }

    getCurrentTime() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aiChat = new AIChat();
    console.log('[AI Chat] Initialized successfully');
});
