/**
 * E7ki Socket.IO Event Handlers
 * Real-time chat functionality with typing indicators, online status, etc.
 */

export function setupE7kiSocket(io) {
  // Track active users and their rooms
  const userRooms = new Map(); // userId -> Set of roomIds
  const roomUsers = new Map(); // roomId -> Set of {userId, socketId, username}

  io.on('connection', (socket) => {
    console.log(`[E7ki] Socket connected: ${socket.id}, User: ${socket.user?.id}`);

    const userId = socket.user?.id;
    const username = socket.user?.username || 'Anonymous';

    if (!userId) {
      socket.disconnect();
      return;
    }

    // Initialize user data
    if (!userRooms.has(userId)) {
      userRooms.set(userId, new Set());
    }

    // ─────────────────────────────────────────────────────────────────
    // JOIN ROOM EVENT
    // ─────────────────────────────────────────────────────────────────
    socket.on('join-room', (data, callback) => {
      try {
        const { roomId } = data;
        if (!roomId) {
          callback({ success: false, error: 'Room ID required' });
          return;
        }

        // Add user to room tracking
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Set());
        }

        const roomSet = roomUsers.get(roomId);
        const userInRoom = Array.from(roomSet).find(u => u.userId === userId);

        if (!userInRoom) {
          roomSet.add({ userId, socketId: socket.id, username });
        }

        // Join Socket.IO room
        socket.join(roomId);
        userRooms.get(userId).add(roomId);

        // Notify others
        io.to(roomId).emit('user-joined', {
          userId,
          username,
          roomId,
          timestamp: new Date().toISOString(),
          totalUsers: roomSet.size
        });

        console.log(`[E7ki] ${username} (${userId}) joined room: ${roomId} (total: ${roomSet.size})`);

        callback({
          success: true,
          message: 'Joined room',
          roomId,
          totalUsers: roomSet.size
        });
      } catch (err) {
        console.error('[E7ki] join-room error:', err);
        callback({ success: false, error: err.message });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // NEW MESSAGE EVENT
    // ─────────────────────────────────────────────────────────────────
    socket.on('send-message', (data, callback) => {
      try {
        const { roomId, content, messageId } = data;

        if (!roomId || !content || content.trim().length === 0) {
          callback({ success: false, error: 'Invalid message' });
          return;
        }

        const message = {
          id: messageId || `msg_${Date.now()}`,
          roomId,
          userId,
          username,
          content: content.trim(),
          timestamp: new Date().toISOString(),
          edited: false
        };

        // Broadcast to room
        io.to(roomId).emit('message', message);

        console.log(`[E7ki] Message in ${roomId}: ${username} - ${content.substring(0, 50)}`);

        callback({ success: true, messageId: message.id });
      } catch (err) {
        console.error('[E7ki] send-message error:', err);
        callback({ success: false, error: err.message });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // TYPING INDICATOR EVENT
    // ─────────────────────────────────────────────────────────────────
    socket.on('typing', (data, callback) => {
      try {
        const { roomId, isTyping } = data;

        if (!roomId) {
          callback({ success: false, error: 'Room ID required' });
          return;
        }

        // Broadcast typing status (exclude sender)
        socket.to(roomId).emit('user-typing', {
          userId,
          username,
          roomId,
          isTyping
        });

        callback({ success: true });
      } catch (err) {
        console.error('[E7ki] typing error:', err);
        callback({ success: false, error: err.message });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // EDIT MESSAGE EVENT
    // ─────────────────────────────────────────────────────────────────
    socket.on('edit-message', (data, callback) => {
      try {
        const { roomId, messageId, newContent } = data;

        if (!messageId || !newContent || newContent.trim().length === 0) {
          callback({ success: false, error: 'Invalid edit request' });
          return;
        }

        const editedMessage = {
          id: messageId,
          roomId,
          userId,
          username,
          content: newContent.trim(),
          timestamp: new Date().toISOString(),
          edited: true,
          editedAt: new Date().toISOString()
        };

        io.to(roomId).emit('message-edited', editedMessage);

        callback({ success: true });
      } catch (err) {
        console.error('[E7ki] edit-message error:', err);
        callback({ success: false, error: err.message });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // DELETE MESSAGE EVENT
    // ─────────────────────────────────────────────────────────────────
    socket.on('delete-message', (data, callback) => {
      try {
        const { roomId, messageId } = data;

        if (!messageId) {
          callback({ success: false, error: 'Message ID required' });
          return;
        }

        io.to(roomId).emit('message-deleted', {
          messageId,
          roomId,
          deletedBy: userId
        });

        callback({ success: true });
      } catch (err) {
        console.error('[E7ki] delete-message error:', err);
        callback({ success: false, error: err.message });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // LEAVE ROOM EVENT
    // ─────────────────────────────────────────────────────────────────
    socket.on('leave-room', (data, callback) => {
      try {
        const { roomId } = data;

        if (!roomId) {
          callback({ success: false, error: 'Room ID required' });
          return;
        }

        socket.leave(roomId);
        userRooms.get(userId)?.delete(roomId);

        const roomSet = roomUsers.get(roomId);
        if (roomSet) {
          const filtered = Array.from(roomSet).filter(u => u.userId !== userId);
          if (filtered.length > 0) {
            roomUsers.set(roomId, new Set(filtered));
          } else {
            roomUsers.delete(roomId);
          }
        }

        io.to(roomId).emit('user-left', {
          userId,
          username,
          roomId,
          totalUsers: (roomSet || new Set()).size - 1,
          timestamp: new Date().toISOString()
        });

        console.log(`[E7ki] ${username} left room: ${roomId}`);

        callback({ success: true });
      } catch (err) {
        console.error('[E7ki] leave-room error:', err);
        callback({ success: false, error: err.message });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // GET ROOM USERS (WHO'S ONLINE)
    // ─────────────────────────────────────────────────────────────────
    socket.on('get-room-users', (data, callback) => {
      try {
        const { roomId } = data;

        if (!roomId) {
          callback({ success: false, error: 'Room ID required' });
          return;
        }

        const roomSet = roomUsers.get(roomId) || new Set();
        const users = Array.from(roomSet).map(u => ({
          userId: u.userId,
          username: u.username
        }));

        callback({
          success: true,
          roomId,
          users,
          totalUsers: users.length
        });
      } catch (err) {
        console.error('[E7ki] get-room-users error:', err);
        callback({ success: false, error: err.message });
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // DISCONNECT EVENT
    // ─────────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[E7ki] Socket disconnected: ${socket.id}, User: ${userId}`);

      // Clean up user from all rooms
      const userRoomSet = userRooms.get(userId);
      if (userRoomSet) {
        userRoomSet.forEach(roomId => {
          const roomSet = roomUsers.get(roomId);
          if (roomSet) {
            const filtered = Array.from(roomSet).filter(u => u.socketId !== socket.id);
            if (filtered.length > 0) {
              roomUsers.set(roomId, new Set(filtered));
            } else {
              roomUsers.delete(roomId);
            }

            // Notify remaining users
            io.to(roomId).emit('user-left', {
              userId,
              username,
              roomId,
              totalUsers: filtered.length,
              timestamp: new Date().toISOString()
            });
          }
        });
        userRooms.delete(userId);
      }
    });

    // ─────────────────────────────────────────────────────────────────
    // ERROR HANDLER
    // ─────────────────────────────────────────────────────────────────
    socket.on('error', (error) => {
      console.error(`[E7ki] Socket error for ${socket.id}:`, error);
    });
  });

  console.log('[E7ki] Socket.IO event handlers initialized');
}
