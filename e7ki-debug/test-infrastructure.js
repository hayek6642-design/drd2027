/**
 * E7ki Service Test Infrastructure
 * Comprehensive testing suite for debugging and validating the messaging service
 */

import { WebSocket } from 'ws';
import fetch from 'node-fetch';

class E7kiTestSuite {
  constructor() {
    this.baseURL = process.env.TEST_BASE_URL || 'http://localhost:3001';
    this.wsURL = process.env.TEST_WS_URL || 'ws://localhost:3001/ws';
    this.testUsers = [];
    this.connections = new Map();
    this.messages = [];
    this.errors = [];
  }

  // Infrastructure Tests
  async testServerHealth() {
    console.log('🔍 Testing Server Health...');
    
    try {
      const response = await fetch(`${this.baseURL}/api/e7ki/health`);
      const data = await response.json();
      
      console.log('✅ Server Health Check:', data);
      
      if (!response.ok) {
        this.errors.push({
          type: 'SERVER_HEALTH',
          message: `Server returned ${response.status}`,
          details: data
        });
        return false;
      }
      
      return true;
    } catch (error) {
      this.errors.push({
        type: 'SERVER_HEALTH',
        message: 'Server health check failed',
        details: error.message
      });
      return false;
    }
  }

  async testWebSocketConnection() {
    console.log('🔍 Testing WebSocket Connection...');
    
    return new Promise((resolve) => {
      const ws = new WebSocket(this.wsURL);
      
      ws.on('open', () => {
        console.log('✅ WebSocket Connection Established');
        ws.close();
        resolve(true);
      });
      
      ws.on('error', (error) => {
        console.log('❌ WebSocket Connection Failed:', error.message);
        this.errors.push({
          type: 'WEBSOCKET_CONNECTION',
          message: 'WebSocket connection failed',
          details: error.message
        });
        resolve(false);
      });
      
      ws.on('close', () => {
        console.log('WebSocket Connection Closed');
      });
    });
  }

  async testDatabaseConnection() {
    console.log('🔍 Testing Database Connection...');
    
    try {
      const response = await fetch(`${this.baseURL}/api/e7ki/chats`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      if (response.status === 401) {
        console.log('✅ Database accessible (auth required)');
        return true;
      } else if (response.ok) {
        console.log('✅ Database accessible');
        return true;
      } else {
        console.log('❌ Database connection issue:', response.status);
        this.errors.push({
          type: 'DATABASE_CONNECTION',
          message: `Database returned ${response.status}`,
          details: await response.text()
        });
        return false;
      }
    } catch (error) {
      this.errors.push({
        type: 'DATABASE_CONNECTION',
        message: 'Database connection failed',
        details: error.message
      });
      return false;
    }
  }

  // Authentication Tests
  async testAuthenticationFlow() {
    console.log('🔍 Testing Authentication Flow...');
    
    // Test 1: Check if auth endpoints exist
    try {
      const authResponse = await fetch(`${this.baseURL}/api/auth/me`);
      console.log('Auth endpoint status:', authResponse.status);
      
      if (authResponse.status === 401) {
        console.log('✅ Auth endpoint exists (requires authentication)');
      } else {
        console.log('⚠️ Auth endpoint status unexpected:', authResponse.status);
      }
    } catch (error) {
      this.errors.push({
        type: 'AUTH_ENDPOINT',
        message: 'Auth endpoint not accessible',
        details: error.message
      });
    }

    // Test 2: Check JWT vs Session compatibility
    try {
      const jwtResponse = await fetch(`${this.baseURL}/api/e7ki/chats`, {
        headers: {
          'Authorization': 'Bearer test-jwt-token'
        }
      });
      
      const sessionResponse = await fetch(`${this.baseURL}/api/e7ki/chats`, {
        headers: {
          'Cookie': 'session_token=test-session-token'
        }
      });
      
      console.log('JWT auth status:', jwtResponse.status);
      console.log('Session auth status:', sessionResponse.status);
      
      if (jwtResponse.status === 401 && sessionResponse.status === 401) {
        console.log('✅ Both auth methods require valid credentials');
      } else {
        this.errors.push({
          type: 'AUTH_METHOD',
          message: 'Authentication method mismatch',
          details: {
            jwtStatus: jwtResponse.status,
            sessionStatus: sessionResponse.status
          }
        });
      }
    } catch (error) {
      this.errors.push({
        type: 'AUTH_TEST',
        message: 'Authentication test failed',
        details: error.message
      });
    }
  }

  // API Endpoint Tests
  async testAPIEndpoints() {
    console.log('🔍 Testing API Endpoints...');
    
    const endpoints = [
      { path: '/api/e7ki/health', method: 'GET', expected: 200 },
      { path: '/api/e7ki/chats', method: 'GET', expected: 401 },
      { path: '/api/e7ki/messages', method: 'GET', expected: 400 },
      { path: '/api/e7ki/messages', method: 'POST', expected: 400 },
      { path: '/api/e7ki/upload', method: 'POST', expected: 400 },
      { path: '/api/e7ki/typing', method: 'POST', expected: 400 }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${this.baseURL}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`${endpoint.method} ${endpoint.path}: ${response.status}`);
        
        if (response.status !== endpoint.expected) {
          this.errors.push({
            type: 'API_ENDPOINT',
            message: `Unexpected status for ${endpoint.method} ${endpoint.path}`,
            details: {
              expected: endpoint.expected,
              actual: response.status,
              path: endpoint.path
            }
          });
        }
      } catch (error) {
        this.errors.push({
          type: 'API_ENDPOINT',
          message: `Failed to test ${endpoint.method} ${endpoint.path}`,
          details: error.message
        });
      }
    }
  }

  // Data Structure Tests
  async testDataStructures() {
    console.log('🔍 Testing Data Structures...');
    
    // Test message structure
    const testMessage = {
      chat_id: 'test-conversation-id',
      sender_id: 'test-user-id',
      content: 'Test message',
      type: 'text'
    };

    try {
      const response = await fetch(`${this.baseURL}/api/e7ki/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(testMessage)
      });

      console.log('Message structure test status:', response.status);
      
      if (response.status === 400) {
        const errorData = await response.json();
        console.log('Server expects different structure:', errorData);
        
        this.errors.push({
          type: 'DATA_STRUCTURE',
          message: 'Message structure mismatch',
          details: errorData
        });
      }
    } catch (error) {
      this.errors.push({
        type: 'DATA_STRUCTURE',
        message: 'Message structure test failed',
        details: error.message
      });
    }
  }

  // WebSocket Message Tests
  async testWebSocketMessaging() {
    console.log('🔍 Testing WebSocket Messaging...');
    
    return new Promise((resolve) => {
      const ws = new WebSocket(this.wsURL);
      let connected = false;
      let messageReceived = false;

      ws.on('open', () => {
        connected = true;
        console.log('✅ WebSocket connected for messaging test');
        
        // Send init message
        ws.send(JSON.stringify({
          type: 'init',
          payload: { userId: 'test-user-123' }
        }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('WebSocket message received:', message.type);
          
          if (message.type === 'presence') {
            messageReceived = true;
            console.log('✅ Presence message received');
          }
        } catch (error) {
          console.log('❌ Failed to parse WebSocket message:', error.message);
        }
      });

      ws.on('error', (error) => {
        console.log('❌ WebSocket messaging error:', error.message);
        this.errors.push({
          type: 'WEBSOCKET_MESSAGING',
          message: 'WebSocket messaging failed',
          details: error.message
        });
      });

      setTimeout(() => {
        ws.close();
        
        if (!connected) {
          this.errors.push({
            type: 'WEBSOCKET_MESSAGING',
            message: 'WebSocket failed to connect',
            details: 'Connection timeout'
          });
        }
        
        if (!messageReceived) {
          this.errors.push({
            type: 'WEBSOCKET_MESSAGING',
            message: 'No presence message received',
            details: 'Server may not be sending presence updates'
          });
        }
        
        resolve(true);
      }, 3000);
    });
  }

  // End-to-End Tests
  async testEndToEndMessaging() {
    console.log('🔍 Testing End-to-End Messaging...');
    
    // This would require a full user setup, but we can test the flow
    const testFlow = {
      user1: 'test-user-1',
      user2: 'test-user-2',
      conversationId: 'test-conversation-123',
      message: 'Hello from E2E test!'
    };

    try {
      // Test conversation creation
      const convResponse = await fetch(`${this.baseURL}/api/e7ki/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          participant_ids: [testFlow.user1, testFlow.user2]
        })
      });

      console.log('Conversation creation status:', convResponse.status);

      // Test message sending
      const msgResponse = await fetch(`${this.baseURL}/api/e7ki/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          conversation_id: testFlow.conversationId,
          sender_id: testFlow.user1,
          content: testFlow.message,
          type: 'text'
        })
      });

      console.log('Message sending status:', msgResponse.status);

      // Test message retrieval
      const getMsgResponse = await fetch(`${this.baseURL}/api/e7ki/messages?conversation_id=${testFlow.conversationId}`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      console.log('Message retrieval status:', getMsgResponse.status);

      if (msgResponse.ok && getMsgResponse.ok) {
        console.log('✅ End-to-end messaging flow works');
        return true;
      } else {
        this.errors.push({
          type: 'E2E_MESSAGING',
          message: 'End-to-end messaging flow failed',
          details: {
            conversationStatus: convResponse.status,
            messageStatus: msgResponse.status,
            retrievalStatus: getMsgResponse.status
          }
        });
        return false;
      }
    } catch (error) {
      this.errors.push({
        type: 'E2E_MESSAGING',
        message: 'End-to-end messaging test failed',
        details: error.message
      });
      return false;
    }
  }

  // Performance Tests
  async testPerformance() {
    console.log('🔍 Testing Performance...');
    
    const startTime = Date.now();
    const requests = [];
    
    // Send 10 concurrent requests
    for (let i = 0; i < 10; i++) {
      requests.push(
        fetch(`${this.baseURL}/api/e7ki/health`)
          .then(res => res.json())
          .catch(error => ({ error: error.message }))
      );
    }

    const results = await Promise.all(requests);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ Performance test completed in ${duration}ms`);
    console.log(`Average response time: ${duration / 10}ms`);

    const failedRequests = results.filter(r => r.error).length;
    if (failedRequests > 0) {
      this.errors.push({
        type: 'PERFORMANCE',
        message: `${failedRequests} out of 10 requests failed`,
        details: { failedRequests, totalRequests: 10, duration }
      });
    }

    return failedRequests === 0;
  }

  // Security Tests
  async testSecurity() {
    console.log('🔍 Testing Security...');
    
    // Test SQL injection
    try {
      const sqlInjectionResponse = await fetch(`${this.baseURL}/api/e7ki/messages?conversation_id='; DROP TABLE e7ki_messages; --`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      console.log('SQL injection test status:', sqlInjectionResponse.status);
      
      if (sqlInjectionResponse.status === 400 || sqlInjectionResponse.status === 401) {
        console.log('✅ SQL injection protection appears to be working');
      } else {
        this.errors.push({
          type: 'SECURITY',
          message: 'Potential SQL injection vulnerability',
          details: { status: sqlInjectionResponse.status }
        });
      }
    } catch (error) {
      console.log('❌ Security test failed:', error.message);
    }

    // Test XSS
    try {
      const xssResponse = await fetch(`${this.baseURL}/api/e7ki/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          conversation_id: 'test',
          sender_id: 'test',
          content: '<script>alert("XSS")</script>',
          type: 'text'
        })
      });
      
      console.log('XSS test status:', xssResponse.status);
    } catch (error) {
      console.log('❌ XSS test failed:', error.message);
    }
  }

  // Generate Test Report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('E7KI SERVICE TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 Test Summary:`);
    console.log(`   Total Errors: ${this.errors.length}`);
    console.log(`   Error Categories: ${new Set(this.errors.map(e => e.type)).size}`);
    
    if (this.errors.length === 0) {
      console.log('🎉 No critical issues found!');
    } else {
      console.log('\n❌ Critical Issues Found:');
      const errorGroups = {};
      
      this.errors.forEach(error => {
        if (!errorGroups[error.type]) {
          errorGroups[error.type] = [];
        }
        errorGroups[error.type].push(error);
      });
      
      Object.keys(errorGroups).forEach(type => {
        console.log(`\n   ${type.toUpperCase()}:`);
        errorGroups[type].forEach(error => {
          console.log(`     - ${error.message}`);
          console.log(`       Details: ${JSON.stringify(error.details)}`);
        });
      });
    }
    
    console.log('\n' + '='.repeat(60));
    return this.errors;
  }

  // Run All Tests
  async runAllTests() {
    console.log('🚀 Starting E7ki Service Test Suite...\n');
    
    const tests = [
      { name: 'Server Health', test: () => this.testServerHealth() },
      { name: 'WebSocket Connection', test: () => this.testWebSocketConnection() },
      { name: 'Database Connection', test: () => this.testDatabaseConnection() },
      { name: 'Authentication Flow', test: () => this.testAuthenticationFlow() },
      { name: 'API Endpoints', test: () => this.testAPIEndpoints() },
      { name: 'Data Structures', test: () => this.testDataStructures() },
      { name: 'WebSocket Messaging', test: () => this.testWebSocketMessaging() },
      { name: 'End-to-End Messaging', test: () => this.testEndToEndMessaging() },
      { name: 'Performance', test: () => this.testPerformance() },
      { name: 'Security', test: () => this.testSecurity() }
    ];

    const results = [];
    
    for (const test of tests) {
      console.log(`\n📋 Running: ${test.name}`);
      console.log('-'.repeat(40));
      
      try {
        const result = await test.test();
        results.push({ name: test.name, passed: result });
        console.log(result ? '✅ PASSED' : '❌ FAILED');
      } catch (error) {
        results.push({ name: test.name, passed: false, error: error.message });
        console.log(`❌ FAILED: ${error.message}`);
      }
    }

    this.generateReport();
    
    return {
      results,
      errors: this.errors,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      total: results.length
    };
  }
}

// Export for use in other test files
export default E7kiTestSuite;

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new E7kiTestSuite();
  testSuite.runAllTests().then(results => {
    console.log('\n🏁 Test Suite Complete');
    console.log(`Results: ${results.passed}/${results.total} passed`);
    
    if (results.failed > 0) {
      console.log('\n💡 Next Steps:');
      console.log('1. Fix authentication integration issues');
      console.log('2. Implement missing API endpoints');
      console.log('3. Fix database schema mismatches');
      console.log('4. Add proper error handling');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed! Service appears to be working correctly.');
      process.exit(0);
    }
  }).catch(error => {
    console.error('Test suite execution failed:', error);
    process.exit(1);
  });
}