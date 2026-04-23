import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './auth-context';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const messageQueue = useRef([]);
  const { user } = useAuth();
  
  const connect = useCallback(() => {
    if (!user?.token) return;
    
    // Robust URL construction
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use port 5000 for E7ki specifically
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:5000`;
    
    console.log('[E7ki] Connecting to WebSocket at:', wsUrl);
    
    const newSocket = io(wsUrl, {
      path: '/ws',
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });
    
    newSocket.on('connect', () => {
      console.log('[E7ki] WebSocket connected');
      setConnected(true);
      setReconnecting(false);
      
      // Flush queued messages
      while (messageQueue.current.length > 0) {
        const msg = messageQueue.current.shift();
        newSocket.emit(msg.event, msg.data);
      }
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('[E7ki] WebSocket disconnected:', reason);
      setConnected(false);
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('[E7ki] Connection error:', error);
      setReconnecting(true);
    });
    
    newSocket.on('error', (error) => {
      console.error('[E7ki] Socket error:', error);
    });

    newSocket.on('new-message', (message) => {
      setLastMessage({ type: 'new-message', payload: message });
    });

    newSocket.on('user-presence', (data) => {
      setLastMessage({ type: 'presence', payload: data });
    });

    newSocket.on('user-typing', (data) => {
      setTypingUsers(prev => ({
        ...prev,
        [data.userId]: data.isTyping ? data.username : null
      }));
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [user?.token]);
  
  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);
  
  const emit = useCallback((event, data) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      // Queue message for when connection returns
      messageQueue.current.push({ event, data });
      console.log('[E7ki] Message queued (offline)');
    }
  }, [socket]);
  
  const joinChat = useCallback((chatId) => {
    emit('join-chat', chatId);
  }, [emit]);
  
  const sendTyping = useCallback((chatId, isTyping) => {
    emit('typing', { chatId, isTyping });
  }, [emit]);
  
  const value = {
    socket,
    connected,
    reconnecting,
    lastMessage,
    typingUsers,
    joinChat,
    sendTyping,
    emit
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
      {!connected && user && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          padding: '10px 20px',
          background: reconnecting ? '#ffa500' : '#ff6b6b',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          fontFamily: 'system-ui'
        }}>
          {reconnecting ? '🔄 Reconnecting...' : '🔌 Offline - Messages queued'}
        </div>
      )}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
  return context;
};
