/**
 * E7ki WebSocket Connection Fix
 * Fixes the critical WebSocket URL construction and connection issues
 */

import { WebSocket } from 'ws';

// Enhanced WebSocket Connection Manager
class E7kiWebSocketManager {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.userId = null;
    this.authToken = null;
    this.eventListeners = new Map();
    this.messageQueue = [];
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, reconnecting
  }

  // Generate WebSocket URL with proper fallback
  getWebSocketURL() {
    try {
      // Method 1: Use environment variables
      if (process.env.VITE_WS_URL) {
        return process.env.VITE_WS_URL;
      }

      // Method 2: Use window.location for browser
      if (typeof window !== 'undefined' && window.location) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host || 'localhost:3001';
        return `${protocol}//${host}/ws`;
      }

      // Method 3: Use environment base URL
      const baseURL = process.env.VITE_API_URL || process.env.TEST_BASE_URL || 'http://localhost:3001';
      const url = new URL(baseURL);
      const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${url.host}/ws`;

    } catch (error) {
      console.warn('WebSocket URL generation failed, using fallback:', error.message);
      return 'ws://localhost:3001/ws';
    }
  }

  // Connect to WebSocket with proper authentication
  async connect(userId, authToken) {
    if (this.isConnected) {
      console.log('WebSocket already connected');
      return true;
    }

    this.userId = userId;
    this.authToken = authToken;
    this.connectionState = 'connecting';

    try {
      const wsUrl = this.getWebSocketURL();
      console.log('Connecting to WebSocket:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.connectionState = 'connected';
        
        // Send authentication
        this.authenticate();
        
        // Send queued messages
        this.processMessageQueue();
        
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.connectionState = 'disconnected';
        
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        // Attempt reconnection if not manually closed
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      // Connection timeout
      setTimeout(() => {
        if (!this.isConnected && this.connectionState === 'connecting') {
          console.error('WebSocket connection timeout');
          this.emit('error', new Error('Connection timeout'));
          this.close();
        }
      }, 10000);

      return true;

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.emit('error', error);
      return false;
    }
  }

  // Authenticate with server
  authenticate() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot authenticate: WebSocket not connected');
      return;
    }

    const authMessage = {
      type: 'auth',
      payload: {
        userId: this.userId,
        token: this.authToken,
        timestamp: Date.now()
      }
    };

    this.send(authMessage);
  }

  // Handle incoming messages
  handleMessage(message) {
    const { type, payload } = message;

    // Handle system messages
    switch (type) {
      case 'auth_success':
        console.log('✅ Authentication successful');
        this.emit('authenticated');
        break;

      case 'auth_failed':
        console.error('❌ Authentication failed:', payload.error);
        this.emit('auth_failed', payload);
        break;

      case 'presence':
        this.emit('presence', payload);
        break;

      case 'message':
        this.emit('message', payload);
        break;

      case 'typing':
        this.emit('typing', payload);
        break;

      case 'read':
        this.emit('read', payload);
        break;

      case 'reaction':
        this.emit('reaction', payload);
        break;

      case 'delete':
        this.emit('delete', payload);
        break;

      default:
        console.log('Unknown message type:', type, payload);
        this.emit('message', message);
    }
  }

  // Send message with queueing for offline support
  send(message) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready, queuing message:', message);
      this.messageQueue.push(message);
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  // Process queued messages
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`Processing ${this.messageQueue.length} queued messages`);
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(message => {
      this.send(message);
    });
  }

  // Reconnect logic
  reconnect() {
    if (this.connectionState === 'reconnecting') {
      return;
    }

    this.connectionState = 'reconnecting';
    this.reconnectAttempts++;
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    setTimeout(() => {
      if (this.connectionState === 'reconnecting') {
        this.connect(this.userId, this.authToken);
      }
    }, delay);
  }

  // Close connection
  close() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.isConnected = false;
    this.connectionState = 'disconnected';
  }

  // Event handling
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Get connection status
  getStatus() {
    return {
      connected: this.isConnected,
      state: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      queueLength: this.messageQueue.length
    };
  }
}

// Client-side WebSocket Fix
export const clientWebSocketFix = `
// Fix for client-side WebSocket connection
// This should replace the existing code in client/src/lib/websocket-context.jsx

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const IS_EMBEDDED = import.meta.env.VITE_EMBEDDED === 'true';

export const WebSocketContext = createContext(undefined);

export function WebSocketProvider({ children, userId }) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [typingUsers, setTypingUsers] = useState(new Map());
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const typingTimersRef = useRef(new Map());
    const presenceLastSeenRef = useRef(new Map());
    
    // Get WebSocket URL with proper fallback
    const getWebSocketURL = useCallback(() => {
        try {
            // Method 1: Use environment variable
            if (import.meta.env.VITE_WS_URL) {
                return import.meta.env.VITE_WS_URL;
            }

            // Method 2: Use window.location for browser
            if (typeof window !== 'undefined' && window.location) {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host || 'localhost:3001';
                return \`\${protocol}//\${host}/ws\`;
            }

            // Method 3: Use API URL
            const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const url = new URL(baseURL);
            const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
            return \`\${protocol}//\${url.host}/ws\`;

        } catch (error) {
            console.warn('WebSocket URL generation failed, using fallback:', error.message);
            return 'ws://localhost:3001/ws';
        }
    }, []);

    const connect = useCallback(() => {
        if (IS_EMBEDDED) return;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

        const wsUrl = getWebSocketURL();
        console.log('Connecting to WebSocket:', wsUrl);

        const socket = new WebSocket(wsUrl);

        wsRef.current = socket;

        socket.onopen = () => {
            setIsConnected(true);
            reconnectAttempts.current = 0;
            
            // Send authentication
            socket.send(JSON.stringify({
                type: "auth",
                payload: { 
                    userId,
                    token: localStorage.getItem('e7ki_token') || localStorage.getItem('jwt_token')
                }
            }));

            // Send presence
            socket.send(JSON.stringify({ 
                type: "presence", 
                payload: { status: "online", userId } 
            }));

            // Heartbeat
            const heartbeat = setInterval(() => {
                try {
                    socket.send(JSON.stringify({ 
                        type: "presence", 
                        payload: { status: "online", userId } 
                    }));
                } catch (_error) { }
            }, 15000);

            socket.onclose = () => {
                clearInterval(heartbeat);
                setIsConnected(false);
                
                // Reconnection logic
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                reconnectAttempts.current++;
                reconnectTimeoutRef.current = setTimeout(connect, delay);
            };
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            socket.close();
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                setLastMessage(message);

                // Handle different message types
                if (message.type === "auth_success") {
                    console.log('✅ Authentication successful');
                } else if (message.type === "auth_failed") {
                    console.error('❌ Authentication failed:', message.payload?.error);
                } else if (message.type === "typing") {
                    const typing = message.payload;
                    setTypingUsers((prev) => {
                        const next = new Map(prev);
                        const key = \`\${typing.chatId}-\${typing.userId}\`;
                        if (typing.isTyping) {
                            next.set(key, typing);
                            const prevTimer = typingTimersRef.current.get(key);
                            if (prevTimer) clearTimeout(prevTimer);
                            const t = setTimeout(() => {
                                setTypingUsers((p) => {
                                    const m = new Map(p);
                                    m.delete(key);
                                    return m;
                                });
                                typingTimersRef.current.delete(key);
                            }, 4000);
                            typingTimersRef.current.set(key, t);
                        } else {
                            next.delete(key);
                        }
                        return next;
                    });
                } else if (message.type === "presence") {
                    const presence = message.payload;
                    presenceLastSeenRef.current.set(presence.userId, Date.now());
                    setOnlineUsers((prev) => {
                        const next = new Set(prev);
                        if (presence.status === "online") {
                            next.add(presence.userId);
                        }
                        if (presence.status === "offline") {
                            next.delete(presence.userId);
                        }
                        return next;
                    });
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };
    }, [userId, getWebSocketURL]);

    useEffect(() => {
        connect();

        // Cleanup presence sweep
        const sweep = setInterval(() => {
            const now = Date.now();
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                for (const user of next) {
                    const last = presenceLastSeenRef.current.get(user) || 0;
                    if (now - last > 30000) {
                        next.delete(user);
                    }
                }
                return next;
            });
        }, 10000);

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            clearInterval(sweep);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    const sendMessage = useCallback((message) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
            return true;
        }
        return false;
    }, []);

    return (
        <WebSocketContext.Provider value={{
            isConnected,
            sendMessage,
            lastMessage,
            typingUsers,
            onlineUsers,
        }}>
            {children}
        </WebSocketContext.Provider>
    );
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (context === undefined) {
        throw new Error("useWebSocket must be used within a WebSocketProvider");
    }
    return context;
}
`;

// Server-side WebSocket Fix
export const serverWebSocketFix = `
// Fix for server-side WebSocket handling
// This should be added to server/routes.js

import { WebSocketServer, WebSocket } from "ws";
import { log } from "./index.js";
import { registerFileRoutes } from "./fileUpload.js";
import { e7kiDatabase } from "./database.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const clients = new Map();
const PRESENCE_TIMEOUT = 30000;

// Enhanced WebSocket connection handler
export function handleWebSocketConnection(wss) {
    wss.on("connection", (ws, request) => {
        let clientId = null;
        let userId = null;
        let isAuthenticated = false;
        
        log("New WebSocket connection", "ws");
        
        ws.on("message", (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                // Handle authentication
                if (message.type === "auth") {
                    const { userId: authUserId, token } = message.payload || {};
                    
                    if (!authUserId || !token) {
                        ws.send(JSON.stringify({
                            type: "auth_failed",
                            payload: { error: "Missing credentials" }
                        }));
                        return;
                    }

                    // Validate token (implement your token validation logic)
                    if (validateToken(token)) {
                        userId = authUserId;
                        clientId = userId;
                        isAuthenticated = true;
                        clients.set(clientId, { 
                            ws, 
                            userId, 
                            lastSeen: Date.now(), 
                            status: "online",
                            isAuthenticated: true
                        });
                        
                        ws.send(JSON.stringify({
                            type: "auth_success",
                            payload: { message: "Authentication successful" }
                        }));

                        log(\`Client \${clientId} authenticated\`, "ws");
                        
                        // Broadcast presence
                        broadcast({
                            type: "presence",
                            payload: { userId: clientId, status: "online" },
                        }, clientId);
                    } else {
                        ws.send(JSON.stringify({
                            type: "auth_failed",
                            payload: { error: "Invalid token" }
                        }));
                        ws.close(1008, "Authentication failed");
                    }
                    return;
                }

                // Require authentication for other messages
                if (!isAuthenticated) {
                    ws.send(JSON.stringify({
                        type: "error",
                        payload: { error: "Authentication required" }
                    }));
                    return;
                }

                // Handle authenticated messages
                switch (message.type) {
                    case "init":
                        clientId = message.payload.userId;
                        clients.set(clientId, { ws, userId: clientId, lastSeen: Date.now(), status: "online" });
                        log(\`Client \${clientId} connected\`, "ws");
                        broadcast({
                            type: "presence",
                            payload: { userId: clientId, status: "online" },
                        }, clientId);
                        break;

                    case "message":
                        log(\`Message from \${message.payload.senderId}\`, "ws");
                        const sentMessage = {
                            ...message.payload,
                            status: "sent",
                        };
                        broadcast({
                            type: "message",
                            payload: sentMessage,
                        });
                        break;

                    case "typing":
                        broadcast({
                            type: "typing",
                            payload: message.payload,
                        }, message.payload.userId);
                        break;

                    case "read":
                        broadcast({
                            type: "read",
                            payload: message.payload,
                        }, message.payload.userId);
                        break;

                    case "reaction":
                        broadcast({
                            type: "reaction",
                            payload: message.payload,
                        });
                        break;

                    case "presence":
                        {
                            const { status } = message.payload;
                            if (clientId && clients.has(clientId)) {
                                const c = clients.get(clientId);
                                c.lastSeen = Date.now();
                                c.status = status || "online";
                                broadcast({ type: "presence", payload: { userId: clientId, status: c.status } }, clientId);
                            }
                        }
                        break;

                    case "delete":
                        broadcast({
                            type: "delete",
                            payload: message.payload,
                        });
                        break;

                    default:
                        log(\`Unknown message type: \${message.type}\`, "ws");
                }
            } catch (error) {
                log(\`Error parsing message: \${error}\`, "ws");
                ws.send(JSON.stringify({
                    type: "error",
                    payload: { error: "Invalid message format" }
                }));
            }
        });
        
        ws.on("close", () => {
            if (clientId) {
                clients.delete(clientId);
                log(\`Client \${clientId} disconnected\`, "ws");
                broadcast({ type: "presence", payload: { userId: clientId, status: "offline" } }, clientId);
            }
        });
        
        ws.on("error", (error) => {
            log(\`WebSocket error: \${error}\`, "ws");
        });
    });
}

// Token validation function (implement based on your auth system)
function validateToken(token) {
    // Implement your token validation logic here
    // This could validate JWT tokens, session tokens, etc.
    return true; // For now, accept all tokens
}

function broadcast(message, excludeUserId) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client, id) => {
        if (id !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(messageStr);
        }
    });
}

// Enhanced presence monitoring
setInterval(() => {
    const now = Date.now();
    clients.forEach((client, id) => {
        if (client.isAuthenticated && now - (client.lastSeen || 0) > PRESENCE_TIMEOUT) {
            client.status = "offline";
            broadcast({ type: "presence", payload: { userId: id, status: "offline" } }, id);
        }
    });
}, 10000);
`;

// Export for use in other modules
export default {
  E7kiWebSocketManager,
  clientWebSocketFix,
  serverWebSocketFix
};