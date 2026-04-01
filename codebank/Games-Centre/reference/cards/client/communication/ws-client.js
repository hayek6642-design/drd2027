export class WebSocketClient {
    constructor() {
        this.socket = null;
        this.listeners = [];
        this.competitionId = 1; // Default for MVP
        this.userId = Math.floor(Math.random() * 1000); // Mock User ID
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        this.socket = new WebSocket(`${protocol}//${host}/ws`);

        this.socket.onopen = () => {
            console.log('WS Connected');
            this.updateStatus(true);
            this.joinLobby();
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('WS Rx:', data);
            this.notify(data);
        };

        this.socket.onclose = () => {
            console.log('WS Disconnected');
            this.updateStatus(false);
            // Reconnect logic would go here
        };
    }

    joinLobby() {
        this.send({
            type: 'JOIN_LOBBY',
            competitionId: this.competitionId,
            userId: this.userId
        });
    }

    send(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            // Attach context
            data.competitionId = this.competitionId;
            data.userId = this.userId;
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn('WS not open, cannot send:', data);
        }
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify(data) {
        this.listeners.forEach(cb => cb(data));
    }

    updateStatus(isOnline) {
        const el = document.getElementById('connection-status');
        if (el) {
            el.className = isOnline ? 'online' : 'offline';
            el.innerText = isOnline ? '● Online' : '○ Offline';
        }
    }
}
