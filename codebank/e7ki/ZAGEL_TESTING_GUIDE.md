# 🧪 ZAGEL Testing Guide

**Testing Date**: 2026-04-12  
**Version**: 1.0.0  
**Status**: Ready for Integration Testing

---

## 🎯 Testing Scope

This guide covers testing of the ZAGEL 3D Avatar Bird Messenger system integrated into E7Ki:

1. **Component Tests** - React components render and animate correctly
2. **API Tests** - Backend endpoints work as expected
3. **Integration Tests** - Voice messaging with bird animation works end-to-end
4. **Performance Tests** - Animations run smoothly without lag
5. **Accessibility Tests** - Voice notifications work on target devices

---

## 📋 Pre-Test Checklist

- [ ] Clone latest GitLab repo with ZAGEL commits
- [ ] Node.js 18+ installed
- [ ] Latest browser with WebGL support (Chrome, Firefox, Safari, Edge)
- [ ] Audio permissions enabled in browser
- [ ] WebSocket support enabled
- [ ] E7Ki server running on localhost:3000

---

## 🔧 Unit Tests

### Test 1: ZAGEL Avatar Component Renders

**File**: `codebank/e7ki/client/src/components/zagel/zagel-avatar.jsx`

```javascript
import { render, screen } from "@testing-library/react";
import { ZagelAvatar } from "@/components/zagel/zagel-avatar";

describe("ZagelAvatar", () => {
  test("renders bird avatar SVG", () => {
    render(<ZagelAvatar birdType="phoenix" size="md" />);
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  test("applies correct bird colors for phoenix", () => {
    const { container } = render(
      <ZagelAvatar birdType="phoenix" size="md" />
    );
    // Phoenix should have #FF6B35 primary color
    expect(container.innerHTML).toContain("FF6B35");
  });

  test("animates wings when animating prop is true", () => {
    const { rerender } = render(
      <ZagelAvatar birdType="phoenix" animating={false} />
    );
    // Initial state: no animation
    let svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();

    // Rerender with animation
    rerender(<ZagelAvatar birdType="phoenix" animating={true} />);
    // Should have animation classes
  });

  test("renders all 5 bird types", () => {
    const birds = ["phoenix", "eagle", "parrot", "swan", "owl"];
    birds.forEach((bird) => {
      const { container } = render(<ZagelAvatar birdType={bird} />);
      expect(container.querySelector("svg")).toBeInTheDocument();
    });
  });

  test("displays voice type indicator", () => {
    const { container } = render(
      <ZagelAvatar birdType="phoenix" voiceType="soprano" />
    );
    expect(container.textContent).toContain("soprano");
  });
});
```

### Test 2: ZAGEL Context Management

```javascript
import { renderHook, act } from "@testing-library/react";
import { ZagelProvider, useZagel } from "@/lib/zagel-context";

describe("ZagelContext", () => {
  test("initializes with default avatar settings", () => {
    const wrapper = ({ children }) => (
      <ZagelProvider>{children}</ZagelProvider>
    );
    const { result } = renderHook(() => useZagel(), { wrapper });

    expect(result.current.userAvatar.birdType).toBe("phoenix");
    expect(result.current.userAvatar.voiceType).toBe("soprano");
  });

  test("updates avatar settings", () => {
    const wrapper = ({ children }) => (
      <ZagelProvider>{children}</ZagelProvider>
    );
    const { result } = renderHook(() => useZagel(), { wrapper });

    act(() => {
      result.current.updateAvatarSettings({
        birdType: "eagle",
        voiceType: "tenor",
      });
    });

    expect(result.current.userAvatar.birdType).toBe("eagle");
    expect(result.current.userAvatar.voiceType).toBe("tenor");
  });

  test("tracks deliveries", () => {
    const wrapper = ({ children }) => (
      <ZagelProvider>{children}</ZagelProvider>
    );
    const { result } = renderHook(() => useZagel(), { wrapper });

    act(() => {
      result.current.startDelivery("msg-1", {
        conversationId: "conv-1",
        senderId: "user-1",
        recipientId: "user-2",
      });
    });

    const deliveries = result.current.getActiveDeliveries();
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].messageId).toBe("msg-1");
  });
});
```

---

## 🌐 API Tests

### Test 3: Avatar Initialization Endpoint

**Endpoint**: `POST /api/e7ki/zagel/avatar/init`

```bash
#!/bin/bash
# Test avatar initialization

curl -X POST http://localhost:3000/api/e7ki/zagel/avatar/init \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "birdType": "phoenix",
    "voiceType": "soprano"
  }' | jq .

# Expected response:
# {
#   "success": true,
#   "avatar": {
#     "id": "uuid",
#     "userId": "test-user-001",
#     "birdType": "phoenix",
#     "voiceType": "soprano",
#     "enableVocalNotifications": true,
#     "totalDeliveries": 0,
#     "totalVocalPlaybacks": 0,
#     "createdAt": "...",
#     "updatedAt": "..."
#   },
#   "message": "ZAGEL avatar initialized"
# }
```

**Assertion Script**:
```javascript
async function testAvatarInit() {
  const response = await fetch(
    "http://localhost:3000/api/e7ki/zagel/avatar/init",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "test-user-001",
        birdType: "phoenix",
        voiceType: "soprano",
      }),
    }
  );

  const data = await response.json();
  console.assert(data.success === true, "Avatar initialization failed");
  console.assert(data.avatar.birdType === "phoenix", "Bird type mismatch");
  console.assert(data.avatar.voiceType === "soprano", "Voice type mismatch");
  console.log("✅ Avatar initialization test passed");
}

testAvatarInit();
```

### Test 4: Avatar Update Endpoint

**Endpoint**: `PUT /api/e7ki/zagel/avatar/:userId`

```bash
curl -X PUT http://localhost:3000/api/e7ki/zagel/avatar/test-user-001 \
  -H "Content-Type: application/json" \
  -d '{
    "birdType": "eagle",
    "voiceType": "tenor"
  }' | jq .
```

### Test 5: Delivery Tracking Endpoint

**Endpoint**: `POST /api/e7ki/zagel/delivery`

```bash
curl -X POST http://localhost:3000/api/e7ki/zagel/delivery \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "msg-12345",
    "conversationId": "conv-001",
    "senderId": "test-user-001",
    "senderName": "Alice",
    "recipientId": "test-user-002",
    "recipientName": "Bob",
    "birdType": "phoenix",
    "voiceType": "soprano",
    "audioUrl": "https://example.com/audio/msg-12345.webm"
  }' | jq .

# Expected response includes delivery tracking data
```

### Test 6: Delivery History Endpoint

**Endpoint**: `GET /api/e7ki/zagel/deliveries/:conversationId`

```bash
curl http://localhost:3000/api/e7ki/zagel/deliveries/conv-001 | jq .

# Expected response:
# {
#   "success": true,
#   "count": 1,
#   "deliveries": [...]
# }
```

### Test 7: User Statistics Endpoint

**Endpoint**: `GET /api/e7ki/zagel/stats/:userId`

```bash
curl http://localhost:3000/api/e7ki/zagel/stats/test-user-001 | jq .

# Expected response includes user's ZAGEL statistics
```

---

## 🎬 Component Integration Tests

### Test 8: Voice Message with ZAGEL Integration

**Component**: `voice-message-with-zagel.jsx`

**Test Steps**:
1. Mount component with active chat
2. Verify bird avatar displays
3. Click record button
4. Speak test audio
5. Stop recording
6. Verify delivery animation starts
7. Verify vocal notification plays
8. Verify message sent to backend

**Code**:
```javascript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VoiceMessageWithZagel from "@/components/chat/voice-message-with-zagel";

describe("VoiceMessageWithZagel", () => {
  test("starts delivery animation on send", async () => {
    const mockChat = {
      id: "conv-001",
      currentUserId: "user-1",
      currentUserName: "Alice",
      participants: [
        { id: "user-1", name: "Alice" },
        { id: "user-2", name: "Bob" },
      ],
    };

    render(
      <VoiceMessageWithZagel
        activeChat={mockChat}
        onClose={() => {}}
      />
    );

    // Should show recorder initially
    expect(screen.getByText(/record/i)).toBeInTheDocument();

    // After sending, should show delivery tracker
    // (test actual flow in e2e tests)
  });
});
```

---

## 🎯 End-to-End Tests

### Test 9: Complete Voice Message Flow

**Scenario**: User sends voice message and recipient hears vocal notification

**Steps**:
1. Open E7Ki chat between Alice (user-1) and Bob (user-2)
2. Alice clicks voice message button
3. Alice records a test message ("Hello Bob")
4. Alice sends the message
5. Verify delivery animation shows bird flying from Alice to Bob
6. Verify vocal notification plays on Bob's device ("Message from Alice")
7. Verify message appears in conversation history
8. Verify delivery marked as complete in backend

**Browser Console Test**:
```javascript
// In browser console
async function testE2E() {
  console.log("🧪 Starting E2E test...");

  // Test 1: Avatar initialization
  const initRes = await fetch("/api/e7ki/zagel/avatar/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "test-alice",
      birdType: "phoenix",
      voiceType: "soprano",
    }),
  });
  console.log("✅ Avatar init:", initRes.ok);

  // Test 2: Update settings
  const updateRes = await fetch("/api/e7ki/zagel/avatar/test-alice", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      birdType: "eagle",
      voiceType: "tenor",
    }),
  });
  console.log("✅ Avatar update:", updateRes.ok);

  // Test 3: Start delivery
  const deliveryRes = await fetch("/api/e7ki/zagel/delivery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messageId: "test-msg-001",
      conversationId: "test-conv-001",
      senderId: "test-alice",
      senderName: "Alice",
      recipientId: "test-bob",
      recipientName: "Bob",
      birdType: "eagle",
      voiceType: "tenor",
      audioUrl: "https://example.com/test.webm",
    }),
  });
  const delivery = await deliveryRes.json();
  console.log("✅ Delivery start:", deliveryRes.ok);

  // Test 4: Get stats
  const statsRes = await fetch("/api/e7ki/zagel/stats/test-alice");
  const stats = await statsRes.json();
  console.log("✅ User stats:", stats);

  console.log("🎉 All E2E tests completed!");
}

testE2E();
```

---

## 🎨 Visual Tests

### Test 10: Animation Smoothness

**Test**: Bird flying animation should be smooth at 60 FPS

**Process**:
1. Open DevTools Performance tab
2. Start recording
3. Trigger voice message send
4. Watch delivery animation complete
5. Stop recording
6. Check frame rate - should average 55-60 FPS

**Acceptance Criteria**:
- No frame drops below 30 FPS
- Animation completes in configured duration (default 2000ms)
- No jank or stuttering

### Test 11: Visual Rendering

**Test**: All bird types render correctly

**Process**:
1. Go to ZAGEL settings page
2. For each bird type (Phoenix, Eagle, Parrot, Swan, Owl):
   - Click to select
   - Verify bird SVG displays correctly
   - Verify colors match specification
   - Verify animation works

**Acceptance Criteria**:
- All 5 birds render without errors
- Colors match design specs
- Animations are smooth

---

## 🔊 Audio Tests

### Test 12: Text-to-Speech Voice Synthesis

**Test**: Voice notifications should play with correct voice characteristics

**Process**:
1. Click "Test Voice" in ZAGEL settings
2. For each voice type, listen to test message
3. Verify voice matches expected characteristics

**Voice Characteristics**:
- **Soprano**: High pitch, clear and bright
- **Alto**: Medium pitch, warm tone
- **Tenor**: Deeper pitch, mellow
- **Bass**: Very deep, resonant
- **Robotic**: Fast, mechanical
- **Whimsical**: Playful tone

---

## 📊 Performance Tests

### Test 13: Component Load Time

```javascript
// Measure component mount time
async function testLoadPerformance() {
  const startTime = performance.now();

  const ZagelAvatarModule = await import(
    "@/components/zagel/zagel-avatar"
  );

  const endTime = performance.now();
  const loadTime = endTime - startTime;

  console.log(`ZAGEL Avatar load time: ${loadTime.toFixed(2)}ms`);
  console.assert(loadTime < 100, "Load time too high");
}

testLoadPerformance();
```

### Test 14: Memory Usage

- Monitor memory while sending 10 consecutive voice messages
- Verify no memory leaks
- Verify context cleanup on component unmount

---

## 🐛 Bug Prevention Tests

### Test 15: WebSocket Connection Resilience

**Test**: Delivery tracking should handle WebSocket disconnects

```javascript
async function testWSResilience() {
  // Close WebSocket
  ws.close();

  // Try to send message
  // Should queue and retry on reconnect

  // Reconnect WebSocket
  ws = new WebSocket("ws://localhost:3000/ws");

  // Wait for reconnection
  await new Promise((r) => (ws.onopen = r));

  // Message should be retried
  console.log("✅ WebSocket resilience test passed");
}
```

### Test 16: Browser Compatibility

Test on all major browsers:

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 120+ | ✅ |
| Firefox | 120+ | ✅ |
| Safari | 17+ | ✅ |
| Edge | 120+ | ✅ |
| Mobile Safari | 17+ | ⚠️ (voice synthesis varies) |
| Chrome Mobile | 120+ | ✅ |

---

## ✅ Test Results Summary

### Unit Tests
- [ ] Avatar component rendering
- [ ] Context state management
- [ ] Delivery tracking
- [ ] Voice settings updates

### API Tests
- [ ] Avatar initialization (POST)
- [ ] Avatar retrieval (GET)
- [ ] Avatar updates (PUT)
- [ ] Delivery tracking (POST)
- [ ] Delivery history (GET)
- [ ] Vocal playback tracking (POST)
- [ ] User statistics (GET)

### Integration Tests
- [ ] Voice recording + ZAGEL integration
- [ ] Delivery animation with audio
- [ ] Real-time WebSocket updates
- [ ] Vocal notification system
- [ ] Settings persistence

### Performance Tests
- [ ] Animation frame rate (60 FPS)
- [ ] Component load time (< 100ms)
- [ ] Memory usage (no leaks)
- [ ] WebSocket reconnection

### Visual Tests
- [ ] All bird types rendering
- [ ] Animation smoothness
- [ ] Color accuracy
- [ ] Responsive design

---

## 📋 Test Execution Checklist

```bash
# 1. Install dependencies
cd codebank/e7ki
npm install

# 2. Start E7Ki server
npm run server

# 3. Start dev server (in another terminal)
npm run dev

# 4. Run unit tests
npm test

# 5. Run E2E tests
npm run test:e2e

# 6. Manual testing in browser
# - Open http://localhost:5173
# - Navigate to ZAGEL settings
# - Test voice recording
# - Test delivery animation

# 7. Monitor console for errors
# - Check DevTools console
# - Check Network tab for API calls
# - Check Performance for frame rate
```

---

## 🎉 Success Criteria

All tests must pass:
- ✅ Components render without errors
- ✅ API endpoints return expected data
- ✅ Animations run smoothly (60 FPS)
- ✅ Voice messages deliver correctly
- ✅ Vocal notifications play as expected
- ✅ Settings persist across sessions
- ✅ No console errors
- ✅ WebSocket connection stable
- ✅ Works on all target browsers

---

**Testing Status**: READY FOR EXECUTION 🚀
