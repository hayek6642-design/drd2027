// Games Hub WebSocket Server
// Handles real-time communication for Games Centre Hub

import { Server } from 'socket.io';

export class GamesHub {
    constructor(server) {
        this.io = new Server(server, {
            path: '/socket.io/games-hub',
            cors: { origin: '*' }
        });
        
        this.onlineUsers = new Map();
        this.activeGames = new Map();
        this.voiceChannels = new Map();
        this.chatHistory = [];
        
        this.initNamespace();
    }
    
    initNamespace() {
        const nsp = this.io.of('/games-hub');
        
        nsp.on('connection', (socket) => {
            console.log('[GamesHub] User connected:', socket.id);
            
            // Join hub
            socket.on('join-hub', (data) => {
                this.onlineUsers.set(socket.id, {
                    id: data.userId,
                    socket: socket,
                    game: null,
                    voice: false,
                    muted: false,
                    joinedAt: Date.now()
                });
                
                console.log('[GamesHub] User joined hub:', data.userId);
                this.broadcastStats();
                this.broadcastVoiceUsers();
            });
            
            // Join voice channel
            socket.on('join-voice', (data) => {
                const user = this.onlineUsers.get(socket.id);
                if (user) {
                    user.voice = true;
                    console.log('[GamesHub] User joined voice:', data.userId);
                    this.broadcastVoiceUsers();
                }
            });
            
            // Voice state (mute/unmute)
            socket.on('voice-state', (data) => {
                const user = this.onlineUsers.get(socket.id);
                if (user) {
                    user.muted = data.muted;
                    this.broadcastVoiceUsers();
                }
            });
            
            // Chat message
            socket.on('chat-message', (data) => {
                const user = this.onlineUsers.get(socket.id);
                if (user) {
                    const message = {
                        user: data.user,
                        message: data.message,
                        game: data.game || 'lobby',
                        timestamp: Date.now(),
                        userId: user.id
                    };
                    
                    // Store in history
                    this.chatHistory.push(message);
                    if (this.chatHistory.length > 100) {
                        this.chatHistory.shift();
                    }
                    
                    // Broadcast to all
                    nsp.emit('chat-message', {
                        user: data.user,
                        message: data.message,
                        game: data.game || 'lobby',
                        type: 'normal'
                    });
                    
                    console.log(`[GamesHub] Chat from ${data.user}: ${data.message}`);
                }
            });
            
            // Join specific game
            socket.on('join-game', (data) => {
                const user = this.onlineUsers.get(socket.id);
                if (user) {
                    // Leave previous game
                    if (user.game) {
                        socket.leave(`game:${user.game}`);
                        this.updateGameCount(user.game, -1);
                    }
                    
                    // Join new game
                    user.game = data.game;
                    socket.join(`game:${data.game}`);
                    this.updateGameCount(data.game, 1);
                    
                    console.log(`[GamesHub] User ${user.id} joined game: ${data.game}`);
                    
                    // Notify game room
                    nsp.to(`game:${data.game}`).emit('player-joined', {
                        game: data.game,
                        userId: user.id,
                        totalPlayers: this.getGamePlayerCount(data.game)
                    });
                    
                    this.broadcastStats();
                }
            });
            
            // Place bet
            socket.on('place-bet', (data) => {
                const user = this.onlineUsers.get(socket.id);
                if (user && data.game) {
                    console.log(`[GamesHub] Bet from ${user.id}: ${data.action} ${data.amount} on ${data.game}`);
                    
                    // Broadcast to game room
                    nsp.to(`game:${data.game}`).emit('bet-update', {
                        userId: user.id,
                        action: data.action,
                        amount: data.amount,
                        timestamp: Date.now()
                    });
                }
            });
            
            // Game result
            socket.on('game-result', (data) => {
                const user = this.onlineUsers.get(socket.id);
                if (user && data.game) {
                    console.log(`[GamesHub] Game result from ${user.id}: ${data.result} on ${data.game}`);
                    
                    // Could track statistics here
                    // Store in database for leaderboards
                }
            });
            
            // Disconnect
            socket.on('disconnect', () => {
                const user = this.onlineUsers.get(socket.id);
                if (user) {
                    console.log('[GamesHub] User disconnected:', user.id);
                    
                    if (user.game) {
                        this.updateGameCount(user.game, -1);
                    }
                }
                
                this.onlineUsers.delete(socket.id);
                this.broadcastStats();
                this.broadcastVoiceUsers();
            });
        });
    }
    
    updateGameCount(gameId, delta) {
        if (!this.activeGames.has(gameId)) {
            this.activeGames.set(gameId, 0);
        }
        this.activeGames.set(gameId, Math.max(0, this.activeGames.get(gameId) + delta));
    }
    
    getGamePlayerCount(gameId) {
        return this.activeGames.get(gameId) || 0;
    }
    
    broadcastStats() {
        const stats = {
            online: this.onlineUsers.size,
            games: this.activeGames.size,
            voice: Array.from(this.onlineUsers.values()).filter(u => u.voice).length,
            gamePlayers: {}
        };
        
        // Include player counts for each game
        this.activeGames.forEach((count, gameId) => {
            stats.gamePlayers[gameId] = count;
        });
        
        this.io.of('/games-hub').emit('stats', stats);
    }
    
    broadcastVoiceUsers() {
        const voiceUsers = Array.from(this.onlineUsers.values())
            .filter(u => u.voice)
            .map(u => ({
                id: u.id,
                name: u.id.substring(0, 8),
                speaking: false, // Would come from WebRTC analysis
                muted: u.muted,
                avatar: this.getAvatar(u.id)
            }));
        
        this.io.of('/games-hub').emit('voice-users', voiceUsers);
    }
    
    getAvatar(userId) {
        const avatars = ['👤', '🤖', '🎮', '💻', '🎯', '⚡'];
        const hash = userId.charCodeAt(0);
        return avatars[hash % avatars.length];
    }
}


