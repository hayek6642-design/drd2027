/**
 * Phase 3 Code Generation & Autosave Test Script
 * Tests the complete flow from frontend generation to backend persistence
 */

import fetch from 'node-fetch';
import { createServer } from 'http';
import { readFileSync } from 'fs';

// Test configuration
const API_BASE = 'http://localhost:3000/api';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_CLERK_ID = 'test_user_clerk_123';

// Mock Clerk JWT for testing
const MOCK_CLERK_TOKEN = 'mock_clerk_session_token_for_testing';

// Test data
const testCodes = [
  '9F3KQ7MZ8XW2B6LDPH4RATC5YN', // Valid 26-char code
  'INVALID_CODE_TOO_LONG',      // Invalid length
  'invalid_lowercase',          // Invalid format
  '9F3KQ7MZ8XW2B6LDPH4RATC5YN'  // Duplicate code
];

async function testPhase3Flow() {
  console.log('🧪 Starting Phase 3 Code Generation & Autosave Tests\n');
  
  try {
    // Test 1: Generate and save valid code
    console.log('Test 1: Generate and save valid code');
    const validCode = testCodes[0];
    const saveResult = await saveCode(validCode, 'yt-new');
    
    if (saveResult.ok) {
      console.log('✅ Valid code saved successfully');
      console.log(`   Code: ${saveResult.code}`);
      console.log(`   Source: ${saveResult.source}`);
      console.log(`   Created: ${saveResult.created_at}`);
    } else {
      console.log('❌ Failed to save valid code:', saveResult.error);
    }

    // Test 2: Test rate limiting
    console.log('\nTest 2: Test rate limiting');
    const rateLimitResult = await saveCode('ANOTHERCODE1234567890123456', 'yt-new');
    
    if (rateLimitResult.error === 'RATE_LIMIT_EXCEEDED') {
      console.log('✅ Rate limiting working correctly');
    } else {
      console.log('⚠️  Rate limiting may not be working as expected');
    }

    // Test 3: Test invalid code format
    console.log('\nTest 3: Test invalid code format');
    const invalidFormatResult = await saveCode(testCodes[2], 'yt-new');
    
    if (invalidFormatResult.error === 'INVALID_CODE_FORMAT') {
      console.log('✅ Invalid format rejected correctly');
    } else {
      console.log('❌ Invalid format was not rejected');
    }

    // Test 4: Test duplicate code
    console.log('\nTest 4: Test duplicate code rejection');
    const duplicateResult = await saveCode(validCode, 'yt-new');
    
    if (duplicateResult.error === 'DUPLICATE_CODE') {
      console.log('✅ Duplicate code rejected correctly');
    } else {
      console.log('❌ Duplicate code was not rejected');
    }

    // Test 5: Test unauthorized access
    console.log('\nTest 5: Test unauthorized access');
    const unauthorizedResult = await saveCode('UNAUTHORIZED1234567890123456', 'yt-new', '');
    
    if (unauthorizedResult.error === 'UNAUTHORIZED') {
      console.log('✅ Unauthorized access rejected correctly');
    } else {
      console.log('❌ Unauthorized access was not rejected');
    }

    console.log('\n🎉 Phase 3 Tests Complete!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

async function saveCode(code, source, token = MOCK_CLERK_TOKEN) {
  try {
    const response = await fetch(`${API_BASE}/codes/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        code: code,
        source: source,
        metadata: {
          timestamp: Date.now(),
          userAgent: 'Phase3-Test-Client',
          platform: 'Node.js'
        }
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return { ok: false, error: 'NETWORK_ERROR' };
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPhase3Flow();
}

export { testPhase3Flow, saveCode };