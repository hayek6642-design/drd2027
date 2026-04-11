/**
 * E7ki Messenger - React Component
 * WhatsApp-style real-time chat application
 * 
 * Usage: Import and render <E7kiApp /> in your main app
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

const E7kiApp = () => {
  // State
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typing, setTyping] = useState(new Set());
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(null);
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [newRoomData, setNewRoomData] = useState({ name: '', description: '', isPrivate: false });
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messageInputRef = useRef(null);

  // Get auth token (adjust based on your auth system)
  const getAuthToken = useCallback(() => {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }, []);

  // Get socket configuration from backend
  const getSocketConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/e7ki/config');
      if (!response.ok) throw new Error('Failed to get socket config');
      return await response.json();
    } catch (err) {
      console.error('[E7ki] Error fetching config:', err);
      // Fallback to default
      return {
        socketUrl: window.location.origin,
        socketPath: '/ws',
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxRetries: 5
      };
    }
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    const initSocket = async () => {
      const token = getAuthToken();
      if (!token) {
        setError('Authentication required. Please log in.');
        return;
      }

      const config = await getSocketConfig();

      const newSocket = io(config.socketUrl, {
        path: config.socketPath,
        auth: { token },
        reconnection: true,
        reconnectionDelay: config.reconnectionDelay,
        reconnectionDelayMax: config.reconnectionDelayMax,
        maxRetries: config.maxRetries
      });

      newSocket.on('connect', () => {
        console.log('[E7ki] Connected to server');
        setConnected(true);
        setError(null);
      });

      newSocket.on('disconnect', () => {
        console.log('[E7ki] Disconnected from server');
        setConnected(false);
      });

      newSocket.on('error', (err) => {
        console.error('[E7ki] Socket error:', err);
        setError(err || 'Connection error');
      });

      newSocket.on('message', (msg) => {
        setMessages(prev => [...prev, msg]);
      });

      newSocket.on('message-edited', (msg) => {
        setMessages(prev =>
          prev.map(m => m.id === msg.id ? { ...m, ...msg } : m)
        );
      });

      newSocket.on('message-deleted', (data) => {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      });

      newSocket.on('user-typing', (data) => {
        setTyping(prev => {
          const updated = new Set(prev);
          if (data.isTyping) {
            updated.add(data.username);
          } else {
            updated.delete(data.username);
          }
          return updated;
        });
      });

      newSocket.on('user-joined', (data) => {
        setOnlineUsers(prev => new Set([...prev, data.username]));
      });

      newSocket.on('user-left', (data) => {
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          updated.delete(data.username);
          return updated;
        });
      });

      setSocket(newSocket);
    };

    initSocket();

    return () => {
      if (socket && socket.connected) {
        socket.disconnect();
      }
    };
  }, [getAuthToken, getSocketConfig]);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const response = await fetch('/api/e7ki/rooms', {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('[E7ki] Error fetching rooms:', err);
      setError('Failed to load rooms');
    } finally {
      setLoadingRooms(false);
    }
  }, [getAuthToken]);

  // Fetch messages for selected room
  const fetchMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    setLoadingMessages(true);
    try {
      const response = await fetch(`/api/e7ki/rooms/${roomId}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('[E7ki] Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, [getAuthToken]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load rooms on mount
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Load messages when room changes
  useEffect(() => {
    if (selectedRoom) {
      fetchMessages(selectedRoom.id);
      socket?.emit('join-room', { roomId: selectedRoom.id }, (res) => {
        if (!res.success) {
          setError(res.error);
        }
      });
    }
  }, [selectedRoom, fetchMessages, socket]);

  // Handle sending message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedRoom || !socket) return;

    socket.emit('send-message', {
      roomId: selectedRoom.id,
      content: messageInput
    }, (res) => {
      if (res.success) {
        setMessageInput('');
        messageInputRef.current?.focus();
      } else {
        setError(res.error);
      }
    });
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    setMessageInput(e.target.value);

    if (!socket || !selectedRoom) return;

    clearTimeout(typingTimeoutRef.current);

    socket.emit('typing', {
      roomId: selectedRoom.id,
      isTyping: true
    });

    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing', {
        roomId: selectedRoom.id,
        isTyping: false
      });
    }, 3000);
  };

  // Create new room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomData.name.trim()) {
      setError('Room name is required');
      return;
    }

    try {
      const response = await fetch('/api/e7ki/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(newRoomData)
      });

      if (!response.ok) throw new Error('Failed to create room');
      const data = await response.json();

      setRooms(prev => [...prev, data.room]);
      setSelectedRoom(data.room);
      setNewRoomData({ name: '', description: '', isPrivate: false });
      setShowNewRoomModal(false);
    } catch (err) {
      console.error('[E7ki] Error creating room:', err);
      setError('Failed to create room');
    }
  };

  // Render room list
  const renderRoomList = () => (
    <div className="e7ki-sidebar">
      <div className="e7ki-sidebar-header">
        <h2>E7ki Rooms</h2>
        <button
          className="e7ki-btn-new"
          onClick={() => setShowNewRoomModal(true)}
          title="Create new room"
        >
          ➕
        </button>
      </div>

      {loadingRooms ? (
        <p className="e7ki-loading">Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <p className="e7ki-empty">No rooms available</p>
      ) : (
        <div className="e7ki-room-list">
          {rooms.map(room => (
            <div
              key={room.id}
              className={`e7ki-room-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => setSelectedRoom(room)}
            >
              <div className="e7ki-room-name">{room.name}</div>
              {room.description && (
                <div className="e7ki-room-desc">{room.description}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render chat area
  const renderChatArea = () => {
    if (!selectedRoom) {
      return (
        <div className="e7ki-chat-empty">
          <h3>Select a room to start chatting</h3>
        </div>
      );
    }

    return (
      <div className="e7ki-chat">
        {/* Header */}
        <div className="e7ki-chat-header">
          <div className="e7ki-chat-title">
            <h3>{selectedRoom.name}</h3>
            <p className="e7ki-online-count">
              {onlineUsers.size} {onlineUsers.size === 1 ? 'user' : 'users'} online
            </p>
          </div>
          <div className="e7ki-status">
            <span className={`e7ki-dot ${connected ? 'online' : 'offline'}`}></span>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {/* Messages */}
        <div className="e7ki-messages">
          {loadingMessages ? (
            <p className="e7ki-loading">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="e7ki-empty">No messages yet. Start the conversation!</p>
          ) : (
            messages.map(msg => (
              <div
                key={msg.id}
                className={`e7ki-message ${msg.userId === (localStorage.getItem('userId') || sessionStorage.getItem('userId')) ? 'own' : ''}`}
              >
                <div className="e7ki-message-header">
                  <strong>{msg.username}</strong>
                  <span className="e7ki-timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="e7ki-message-content">{msg.content}</div>
                {msg.edited && (
                  <div className="e7ki-edited-label">(edited)</div>
                )}
              </div>
            ))
          )}
          {typing.size > 0 && (
            <div className="e7ki-typing">
              <em>{Array.from(typing).join(', ')} {typing.size === 1 ? 'is' : 'are'} typing...</em>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="e7ki-input-area" onSubmit={handleSendMessage}>
          <input
            ref={messageInputRef}
            type="text"
            placeholder="Type a message..."
            value={messageInput}
            onChange={handleTyping}
            disabled={!connected}
            className="e7ki-input"
          />
          <button
            type="submit"
            disabled={!connected || !messageInput.trim()}
            className="e7ki-send-btn"
          >
            Send
          </button>
        </form>
      </div>
    );
  };

  // Render new room modal
  const renderNewRoomModal = () => {
    if (!showNewRoomModal) return null;

    return (
      <div className="e7ki-modal-overlay" onClick={() => setShowNewRoomModal(false)}>
        <div className="e7ki-modal" onClick={e => e.stopPropagation()}>
          <h3>Create New Room</h3>
          <form onSubmit={handleCreateRoom}>
            <input
              type="text"
              placeholder="Room name *"
              value={newRoomData.name}
              onChange={e => setNewRoomData({ ...newRoomData, name: e.target.value })}
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={newRoomData.description}
              onChange={e => setNewRoomData({ ...newRoomData, description: e.target.value })}
            />
            <label>
              <input
                type="checkbox"
                checked={newRoomData.isPrivate}
                onChange={e => setNewRoomData({ ...newRoomData, isPrivate: e.target.checked })}
              />
              Private room
            </label>
            <div className="e7ki-modal-buttons">
              <button type="submit">Create</button>
              <button type="button" onClick={() => setShowNewRoomModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="e7ki-app">
      {error && (
        <div className="e7ki-error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="e7ki-container">
        {renderRoomList()}
        {renderChatArea()}
      </div>

      {renderNewRoomModal()}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .e7ki-app {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .e7ki-error-banner {
          background: #fee;
          color: #c33;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #fcc;
        }

        .e7ki-error-banner button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 18px;
          color: #c33;
        }

        .e7ki-container {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        /* Sidebar */
        .e7ki-sidebar {
          width: 280px;
          border-right: 1px solid #e5e5e5;
          background: #fff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .e7ki-sidebar-header {
          padding: 16px;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .e7ki-sidebar-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .e7ki-btn-new {
          background: none;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 18px;
          transition: all 0.2s;
        }

        .e7ki-btn-new:hover {
          background: #f0f0f0;
          border-color: #ccc;
        }

        .e7ki-room-list {
          flex: 1;
          overflow-y: auto;
        }

        .e7ki-room-item {
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background 0.2s;
        }

        .e7ki-room-item:hover {
          background: #f9f9f9;
        }

        .e7ki-room-item.active {
          background: #e3f2fd;
          border-left: 3px solid #1976d2;
          padding-left: 13px;
        }

        .e7ki-room-name {
          font-weight: 600;
          margin-bottom: 4px;
        }

        .e7ki-room-desc {
          font-size: 12px;
          color: #999;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .e7ki-loading,
        .e7ki-empty {
          padding: 16px;
          color: #999;
          text-align: center;
          font-size: 14px;
        }

        /* Chat Area */
        .e7ki-chat,
        .e7ki-chat-empty {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .e7ki-chat-empty {
          justify-content: center;
          align-items: center;
          color: #999;
        }

        .e7ki-chat-header {
          padding: 16px;
          border-bottom: 1px solid #e5e5e5;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .e7ki-chat-title h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
        }

        .e7ki-online-count {
          margin: 0;
          font-size: 12px;
          color: #999;
        }

        .e7ki-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .e7ki-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .e7ki-dot.online {
          background: #4caf50;
        }

        .e7ki-dot.offline {
          background: #999;
        }

        /* Messages */
        .e7ki-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .e7ki-message {
          background: #f0f0f0;
          padding: 8px 12px;
          border-radius: 8px;
          max-width: 70%;
          word-wrap: break-word;
        }

        .e7ki-message.own {
          align-self: flex-end;
          background: #1976d2;
          color: white;
        }

        .e7ki-message-header {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .e7ki-message.own .e7ki-message-header {
          color: rgba(255, 255, 255, 0.8);
        }

        .e7ki-timestamp {
          opacity: 0.7;
          font-size: 11px;
        }

        .e7ki-message-content {
          word-wrap: break-word;
          white-space: pre-wrap;
        }

        .e7ki-edited-label {
          font-size: 11px;
          opacity: 0.6;
          margin-top: 4px;
        }

        .e7ki-typing {
          padding: 8px 12px;
          color: #999;
          font-size: 12px;
          font-style: italic;
        }

        /* Input */
        .e7ki-input-area {
          padding: 12px 16px;
          border-top: 1px solid #e5e5e5;
          display: flex;
          gap: 8px;
        }

        .e7ki-input {
          flex: 1;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }

        .e7ki-input:focus {
          border-color: #1976d2;
        }

        .e7ki-input:disabled {
          background: #f5f5f5;
          color: #999;
        }

        .e7ki-send-btn {
          padding: 10px 20px;
          background: #1976d2;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .e7ki-send-btn:hover:not(:disabled) {
          background: #1565c0;
        }

        .e7ki-send-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* Modal */
        .e7ki-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .e7ki-modal {
          background: white;
          border-radius: 8px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
        }

        .e7ki-modal h3 {
          margin-top: 0;
          margin-bottom: 16px;
        }

        .e7ki-modal input[type="text"],
        .e7ki-modal textarea {
          width: 100%;
          padding: 10px;
          margin-bottom: 12px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
        }

        .e7ki-modal label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          cursor: pointer;
        }

        .e7ki-modal-buttons {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .e7ki-modal button {
          padding: 8px 16px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .e7ki-modal button[type="submit"] {
          background: #1976d2;
          color: white;
          border: none;
        }

        .e7ki-modal button[type="submit"]:hover {
          background: #1565c0;
        }

        .e7ki-modal button[type="button"]:hover {
          background: #f0f0f0;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .e7ki-sidebar {
            display: none;
          }

          .e7ki-message {
            max-width: 85%;
          }
        }
      `}</style>
    </div>
  );
};

export default E7kiApp;
