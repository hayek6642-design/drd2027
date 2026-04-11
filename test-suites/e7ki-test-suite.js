#!/usr/bin/env node

/**
 * E7ki Messenger - Complete Test Suite
 * Tests user authentication, chat rooms, messaging, and WebSocket connectivity
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { io } from 'socket.io-client';

const BASE_URL = process.env.SERVER_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'secret-demo';
const WS_PATH = '/ws';

// ============================================================================
// TEST DATA
// ============================================================================

const testUsers = [
  {
    id: 'user_001_test',
    username: 'Alice',
    email: 'alice@test.local',
    role: 'user'
  },
  {
    id: 'user_002_test',
    username: 'Bob',
    email: 'bob@test.local',
    role: 'user'
  }
];

let testResults = {
  passed: [],
  failed: [],
  warnings: [],
  startTime: new Date(),
  endTime: null
};

// ============================================================================
// UTILITIES
// ============================================================================

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80));
}

function logTest(name, status, details = '') {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️ ';
  console.log(`${emoji} ${name}`);
  if (details) console.log(`   └─ ${details}`);
  
  if (status === 'PASS') {
    testResults.passed.push(name);
  } else if (status === 'FAIL') {
    testResults.failed.push({ test: name, error: details });
  } else {
    testResults.warnings.push({ test: name, warning: details });
  }
}

async function apiRequest(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${BASE_URL}${path}`, opts);
    const data = await res.json();
    return { status: res.status, data, ok: res.ok };
  } catch (err) {
    return { status: 0, data: null, error: err.message, ok: false };
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function testServerHealth() {
  logSection('1. SERVER HEALTH CHECK');

  try {
    const res = await fetch(`${BASE_URL}/api/e7ki/health`);
    const data = await res.json();
    
    if (data.status === 'online') {
      logTest('Server Health', 'PASS', `E7ki Messenger ${data.version} online`);
      return true;
    } else {
      logTest('Server Health', 'FAIL', `Unexpected status: ${data.status}`);
      return false;
    }
  } catch (err) {
    logTest('Server Health', 'FAIL', `Cannot reach server: ${err.message}`);
    return false;
  }
}

async function testWebSocketConfig() {
  logSection('2. WEBSOCKET CONFIGURATION');

  try {
    const res = await fetch(`${BASE_URL}/api/e7ki/config`);
    const config = await res.json();

    logTest('WS Config Endpoint', 'PASS', `Config retrieved: ${config.socketUrl}${config.socketPath}`);
    return config;
  } catch (err) {
    logTest('WS Config Endpoint', 'FAIL', err.message);
    return null;
  }
}

async function testUserAuthentication() {
  logSection('3. USER AUTHENTICATION');

  const tokens = {};

  for (const user of testUsers) {
    try {
      const token = generateToken(user);
      tokens[user.id] = token;
      
      // Verify token is valid
      const decoded = jwt.verify(token, JWT_SECRET);
      logTest(`Auth Token for ${user.username}`, 'PASS', `Token generated and verified`);
    } catch (err) {
      logTest(`Auth Token for ${user.username}`, 'FAIL', err.message);
    }
  }

  return tokens;
}

async function testCreateChatRoom(ownerToken) {
  logSection('4. CREATE CHAT ROOM');

  const roomData = {
    name: 'E7ki Test Room',
    description: 'Testing E7ki Messenger functionality',
    isPrivate: false
  };

  try {
    const res = await apiRequest('POST', '/api/e7ki/rooms', roomData, ownerToken);
    
    if (res.ok && res.data.success) {
      const room = res.data.room;
      logTest('Create Room', 'PASS', `Room "${room.name}" created with ID: ${room.id}`);
      return room;
    } else {
      logTest('Create Room', 'FAIL', res.data?.error || 'Unknown error');
      return null;
    }
  } catch (err) {
    logTest('Create Room', 'FAIL', err.message);
    return null;
  }
}

async function testGetRooms(userToken) {
  logSection('5. LIST ROOMS');

  try {
    const res = await apiRequest('GET', '/api/e7ki/rooms', null, userToken);
    
    if (res.ok && res.data.success) {
      logTest('List Rooms', 'PASS', `Retrieved ${res.data.count} rooms`);
      return res.data.rooms || [];
    } else {
      logTest('List Rooms', 'WARN', 'No rooms found or access denied');
      return [];
    }
  } catch (err) {
    logTest('List Rooms', 'FAIL', err.message);
    return [];
  }
}

async function testJoinRoom(roomId, userToken, userName) {
  logSection(`6. JOIN ROOM - ${userName}`);

  try {
    const res = await apiRequest('POST', `/api/e7ki/rooms/${roomId}/join`, {}, userToken);
    
    if (res.ok && res.data.success) {
      logTest(`Join Room (${userName})`, 'PASS', res.data.message);
      return true;
    } else {
      logTest(`Join Room (${userName})`, 'FAIL', res.data?.error || 'Unknown error');
      return false;
    }
  } catch (err) {
    logTest(`Join Room (${userName})`, 'FAIL', err.message);
    return false;
  }
}

async function testSocketIOConnection(token, userName) {
  logSection(`7. WEBSOCKET CONNECTION - ${userName}`);

  return new Promise((resolve) => {
    const socketUrl = `${BASE_URL.replace('http', 'ws')}${WS_PATH}`;
    
    const socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxRetries: 3
    });

    const timeout = setTimeout(() => {
      logTest(`Socket.IO Connection (${userName})`, 'FAIL', 'Connection timeout');
      socket.disconnect();
      resolve(null);
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      logTest(`Socket.IO Connection (${userName})`, 'PASS', `Connected with ID: ${socket.id}`);
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      logTest(`Socket.IO Connection (${userName})`, 'FAIL', `Connection error: ${err.message}`);
      resolve(null);
    });

    socket.on('error', (err) => {
      console.log(`⚠️  Socket.IO Error (${userName}):`, err);
    });
  });
}

async function testRealTimeMessaging(room, user1, user2, socket1, socket2) {
  logSection('8. REAL-TIME MESSAGING');

  // Test 1: Join room on both sockets
  return new Promise((resolve) => {
    const messages = [];
    let joinedUsers = 0;
    const timeout = setTimeout(() => {
      logTest('Join Room (Socket)', 'FAIL', 'Join room timeout');
      resolve(false);
    }, 5000);

    socket1.emit('join-room', { roomId: room.id }, (res) => {
      if (res.success) {
        logTest(`Join Room Socket (${user1.username})`, 'PASS', `${res.totalUsers} users in room`);
        joinedUsers++;
      } else {
        logTest(`Join Room Socket (${user1.username})`, 'FAIL', res.error);
      }
    });

    socket2.emit('join-room', { roomId: room.id }, (res) => {
      if (res.success) {
        logTest(`Join Room Socket (${user2.username})`, 'PASS', `${res.totalUsers} users in room`);
        joinedUsers++;
      } else {
        logTest(`Join Room Socket (${user2.username})`, 'FAIL', res.error);
      }
    });

    // Listen for user-joined event
    socket1.on('user-joined', (data) => {
      console.log(`   └─ User joined event: ${data.username} (${data.totalUsers} total)`);
    });

    socket2.on('user-joined', (data) => {
      console.log(`   └─ User joined event: ${data.username} (${data.totalUsers} total)`);
    });

    // Send message from user1
    setTimeout(() => {
      if (joinedUsers === 2) {
        socket1.emit('send-message', 
          { 
            roomId: room.id, 
            content: `Hello from ${user1.username}!`,
            messageId: `msg_${Date.now()}_1`
          }, 
          (res) => {
            if (res.success) {
              logTest(`Send Message (${user1.username})`, 'PASS', 'Message sent');
            } else {
              logTest(`Send Message (${user1.username})`, 'FAIL', res.error);
            }
          }
        );
      }
    }, 500);

    // Listen for messages
    socket2.on('message', (msg) => {
      if (msg.userId === user1.id) {
        logTest('Receive Message', 'PASS', `Received: "${msg.content}" from ${msg.username}`);
        messages.push(msg);
      }
    });

    // Send message from user2
    setTimeout(() => {
      socket2.emit('send-message', 
        { 
          roomId: room.id, 
          content: `Hi ${user1.username}, this is ${user2.username}!`,
          messageId: `msg_${Date.now()}_2`
        }, 
        (res) => {
          if (res.success) {
            logTest(`Send Message (${user2.username})`, 'PASS', 'Message sent');
          } else {
            logTest(`Send Message (${user2.username})`, 'FAIL', res.error);
          }
        }
      );
    }, 1000);

    // Listen for messages on socket1
    socket1.on('message', (msg) => {
      if (msg.userId === user2.id) {
        logTest('Receive Message', 'PASS', `Received: "${msg.content}" from ${msg.username}`);
        messages.push(msg);
      }
    });

    setTimeout(() => {
      clearTimeout(timeout);
      resolve(messages.length >= 2);
    }, 3000);
  });
}

async function testTypingIndicators(room, user1, user2, socket1, socket2) {
  logSection('9. TYPING INDICATORS');

  return new Promise((resolve) => {
    let typingDetected = false;
    const timeout = setTimeout(() => {
      if (!typingDetected) {
        logTest('Typing Indicator', 'FAIL', 'No typing event received');
      }
      resolve(typingDetected);
    }, 3000);

    socket2.on('user-typing', (data) => {
      if (data.userId === user1.id && data.isTyping) {
        logTest('Typing Indicator', 'PASS', `${data.username} is typing...`);
        typingDetected = true;
        clearTimeout(timeout);
        resolve(true);
      }
    });

    // Simulate typing from user1
    socket1.emit('typing', { roomId: room.id, isTyping: true }, (res) => {
      console.log(`   └─ Typing event sent: ${res.success}`);
    });
  });
}

async function testMessageHistory(room, userToken) {
  logSection('10. MESSAGE HISTORY');

  try {
    const res = await apiRequest('GET', `/api/e7ki/rooms/${room.id}/messages?limit=50`, null, userToken);
    
    if (res.ok && res.data.success) {
      logTest('Message History', 'PASS', `Retrieved ${res.data.count} messages`);
      return true;
    } else {
      logTest('Message History', 'FAIL', res.data?.error || 'Unknown error');
      return false;
    }
  } catch (err) {
    logTest('Message History', 'FAIL', err.message);
    return false;
  }
}

async function testRoomMembers(room, userToken) {
  logSection('11. ROOM MEMBERS');

  try {
    const res = await apiRequest('GET', `/api/e7ki/rooms/${room.id}`, null, userToken);
    
    if (res.ok && res.data.success) {
      logTest('Room Members', 'PASS', `Room has ${res.data.memberCount} members`);
      return true;
    } else {
      logTest('Room Members', 'FAIL', res.data?.error || 'Unknown error');
      return false;
    }
  } catch (err) {
    logTest('Room Members', 'FAIL', err.message);
    return false;
  }
}

async function testDisconnectReconnect(socket, userName) {
  logSection(`12. DISCONNECT/RECONNECT - ${userName}`);

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logTest(`Reconnection (${userName})`, 'FAIL', 'Reconnection timeout');
      resolve(false);
    }, 5000);

    // Disconnect
    socket.disconnect();
    logTest(`Disconnect (${userName})`, 'PASS', 'Socket disconnected');

    // Reconnect
    setTimeout(() => {
      socket.connect();
      socket.on('connect', () => {
        clearTimeout(timeout);
        logTest(`Reconnection (${userName})`, 'PASS', `Reconnected with ID: ${socket.id}`);
        resolve(true);
      });
    }, 500);
  });
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    E7KI MESSENGER - COMPLETE TEST SUITE                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\n📍 Server URL: ${BASE_URL}`);
  console.log(`⏰ Started: ${testResults.startTime.toISOString()}\n`);

  try {
    // 1. Server health
    const isHealthy = await testServerHealth();
    if (!isHealthy) {
      console.log('\n❌ Server is not responding. Cannot continue tests.');
      process.exit(1);
    }

    // 2. WebSocket config
    const wsConfig = await testWebSocketConfig();

    // 3. User authentication
    const tokens = await testUserAuthentication();

    // 4. Create chat room
    const room = await testCreateChatRoom(tokens[testUsers[0].id]);
    if (!room) {
      console.log('\n❌ Failed to create chat room. Cannot continue tests.');
      process.exit(1);
    }

    // 5. List rooms
    await testGetRooms(tokens[testUsers[0].id]);

    // 6. Join room (REST API)
    await testJoinRoom(room.id, tokens[testUsers[0].id], testUsers[0].username);
    await testJoinRoom(room.id, tokens[testUsers[1].id], testUsers[1].username);

    // 7. WebSocket connections
    const socket1 = await testSocketIOConnection(tokens[testUsers[0].id], testUsers[0].username);
    const socket2 = await testSocketIOConnection(tokens[testUsers[1].id], testUsers[1].username);

    if (!socket1 || !socket2) {
      console.log('\n⚠️  One or more WebSocket connections failed. Skipping real-time tests.');
    } else {
      // 8. Real-time messaging
      await testRealTimeMessaging(room, testUsers[0], testUsers[1], socket1, socket2);

      // 9. Typing indicators
      await testTypingIndicators(room, testUsers[0], testUsers[1], socket1, socket2);

      // 10. Disconnect/Reconnect
      await testDisconnectReconnect(socket1, testUsers[0].username);
      await testDisconnectReconnect(socket2, testUsers[1].username);

      // Clean up
      socket1.disconnect();
      socket2.disconnect();
    }

    // 11. Message history (REST API)
    await testMessageHistory(room, tokens[testUsers[0].id]);

    // 12. Room members (REST API)
    await testRoomMembers(room, tokens[testUsers[0].id]);

  } catch (err) {
    console.error('\n❌ Test suite error:', err.message);
    logTest('Test Suite', 'FAIL', err.message);
  }

  // ========================================================================
  // GENERATE REPORT
  // ========================================================================

  testResults.endTime = new Date();
  const duration = (testResults.endTime - testResults.startTime) / 1000;

  logSection('TEST RESULTS SUMMARY');

  console.log(`\n✅ Passed: ${testResults.passed.length}`);
  testResults.passed.forEach(t => console.log(`   └─ ${t}`));

  if (testResults.failed.length > 0) {
    console.log(`\n❌ Failed: ${testResults.failed.length}`);
    testResults.failed.forEach(t => {
      console.log(`   └─ ${t.test}`);
      console.log(`      └─ Error: ${t.error}`);
    });
  }

  if (testResults.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${testResults.warnings.length}`);
    testResults.warnings.forEach(t => console.log(`   └─ ${t.test}: ${t.warning}`));
  }

  console.log(`\n⏱️  Duration: ${duration.toFixed(2)}s`);
  console.log(`📊 Total Tests: ${testResults.passed.length + testResults.failed.length}`);
  console.log(`📈 Success Rate: ${((testResults.passed.length / (testResults.passed.length + testResults.failed.length)) * 100).toFixed(1)}%`);

  if (testResults.failed.length === 0) {
    console.log('\n🎉 ALL TESTS PASSED! E7ki Messenger is fully functional!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
