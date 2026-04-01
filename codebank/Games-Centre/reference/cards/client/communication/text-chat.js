export class TextChat {
    constructor(wsClient) {
        this.ws = wsClient;
        this.container = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input');
        
        this.bindEvents();
        this.ws.subscribe(this.onMessage.bind(this));
    }

    bindEvents() {
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const text = this.input.value;
                if (text.trim()) {
                    this.sendMessage(text);
                    this.input.value = '';
                }
            }
        });
    }

    sendMessage(text) {
        // Optimistic UI
        this.appendMessage('You', text);
        this.ws.send({
            type: 'CHAT_MESSAGE',
            content: text
        });
    }

    onMessage(data) {
        if (data.type === 'CHAT_MESSAGE') {
            this.appendMessage(`Player ${data.userId}`, data.content);
        }
    }

    appendMessage(sender, text) {
        const div = document.createElement('div');
        div.className = 'message';
        div.innerText = `${sender}: ${text}`;
        this.container.appendChild(div);
        this.container.scrollTop = this.container.scrollHeight;
    }
}
