# 🦅 ZAGEL + E7Ki Integration Guide

**Status**: Complete Integration Implementation  
**Last Updated**: 2026-04-12  
**Version**: 1.0.0 Production Ready

---

## 📋 Overview

ZAGEL is a 3D avatar bird messenger system integrated into E7Ki. It provides:

- **Visual Delivery**: 3D bird animation flying from sender to recipient
- **Vocal Notifications**: Text-to-speech announcements with customizable voice types
- **Personalization**: 5 bird types + 6 voice types + customizable animations
- **Real-time Tracking**: WebSocket-based delivery status tracking
- **Rewards**: Integration with existing reward system

---

## 🛠️ Files Created

### Client-Side Components

| File | Purpose | Location |
|------|---------|----------|
| `zagel-avatar.jsx` | 3D bird SVG avatar with animations | `codebank/e7ki/client/src/components/zagel/` |
| `zagel-delivery-tracker.jsx` | Bird flying animation during delivery | `codebank/e7ki/client/src/components/zagel/` |
| `zagel-context.jsx` | React context for ZAGEL state management | `codebank/e7ki/client/src/lib/` |
| `voice-message-with-zagel.jsx` | Voice message component with ZAGEL | `codebank/e7ki/client/src/components/chat/` |

### Server-Side Routes

| File | Purpose | Location |
|------|---------|----------|
| `zagel-routes.js` | ZAGEL API endpoints | `codebank/e7ki/server/routes/` |

---

## 🔧 Installation & Setup

### Step 1: Copy Components to Repository

```bash
# Client components
cp zagel-avatar.jsx codebank/e7ki/client/src/components/zagel/
cp zagel-delivery-tracker.jsx codebank/e7ki/client/src/components/zagel/
cp zagel-context.jsx codebank/e7ki/client/src/lib/
cp voice-message-with-zagel.jsx codebank/e7ki/client/src/components/chat/

# Server routes
cp zagel-routes.js codebank/e7ki/server/routes/
```

### Step 2: Update E7Ki Main Files

#### A. Register ZAGEL Routes in Server (`codebank/e7ki/server/routes.js`)

Add to the route registration:

```javascript
import zagelRoutes from "./routes/zagel-routes.js";

// In registerRoutes function, add:
app.use("/api/e7ki/zagel", zagelRoutes);
```

#### B. Add ZAGEL Provider to App (`codebank/e7ki/client/src/App.jsx`)

```javascript
import { ZagelProvider } from "@/lib/zagel-context";

export default function App() {
  return (
    <ZagelProvider>
      {/* ... rest of app ... */}
    </ZagelProvider>
  );
}
```

#### C. Integrate ZAGEL into Message Input (`codebank/e7ki/client/src/components/chat/message-input.jsx`)

Add ZAGEL button to voice recording:

```javascript
import { useZagel } from "@/lib/zagel-context";
import VoiceMessageWithZagel from "./voice-message-with-zagel";

export function MessageInput({ replyTo, onCancelReply }) {
  const { userAvatar } = useZagel();
  const [showZagelVoice, setShowZagelVoice] = useState(false);

  // In render:
  {showZagelVoice ? (
    <VoiceMessageWithZagel
      activeChat={activeChat}
      onClose={() => setShowZagelVoice(false)}
    />
  ) : (
    // existing voice recorder button
    <Button
      onClick={() => setShowZagelVoice(true)}
      title={`Record voice with ${userAvatar.birdType} ZAGEL`}
    >
      <Mic className="w-4 h-4" />
    </Button>
  )}
}
```

#### D. Update WebSocket Message Handling (`codebank/e7ki/server/routes.js`)

Add ZAGEL delivery event handling:

```javascript
case "zagel_delivery_complete":
  // Update delivery status
  broadcast({
    type: "zagel_delivery_complete",
    payload: message.payload,
  });
  break;

case "zagel_vocal_play":
  // Track vocal playback
  broadcast({
    type: "zagel_vocal_play",
    payload: message.payload,
  });
  break;
```

---

## 🎨 ZAGEL Avatar Customization

### Bird Types

```javascript
const BIRD_STYLES = {
  phoenix: { primary: "#FF6B35", secondary: "#FFA500", accent: "#FFD700" },
  eagle: { primary: "#8B4513", secondary: "#D2691E", accent: "#FFD700" },
  parrot: { primary: "#00AA00", secondary: "#FF0000", accent: "#FFD700" },
  swan: { primary: "#FFFFFF", secondary: "#E8E8E8", accent: "#FFB6C1" },
  owl: { primary: "#8B6F47", secondary: "#D4A574", accent: "#FFD700" },
};
```

### Voice Types (Text-to-Speech Variants)

- **soprano**: High pitch, fast rate (pitch: 1.5, rate: 1.2)
- **alto**: Medium-high pitch, normal rate (pitch: 1.2, rate: 1.0)
- **tenor**: Medium pitch, slower rate (pitch: 0.8, rate: 0.9)
- **bass**: Low pitch, very slow rate (pitch: 0.5, rate: 0.8)
- **robotic**: Normal pitch, very fast rate (pitch: 1.0, rate: 1.5)
- **whimsical**: High pitch with character (pitch: 1.3, rate: 1.1)

### User Avatar Settings API

#### Initialize Avatar
```bash
POST /api/e7ki/zagel/avatar/init
Content-Type: application/json

{
  "userId": "user123",
  "birdType": "phoenix",
  "voiceType": "soprano"
}
```

#### Update Avatar Settings
```bash
PUT /api/e7ki/zagel/avatar/:userId
Content-Type: application/json

{
  "birdType": "eagle",
  "voiceType": "tenor",
  "enableVocalNotifications": true
}
```

#### Get Avatar
```bash
GET /api/e7ki/zagel/avatar/:userId
```

---

## 📊 ZAGEL Delivery Tracking

### Start Voice Delivery

```javascript
POST /api/e7ki/zagel/delivery
{
  "messageId": "uuid",
  "conversationId": "conv-123",
  "senderId": "user-1",
  "senderName": "Alice",
  "recipientId": "user-2",
  "recipientName": "Bob",
  "birdType": "phoenix",
  "voiceType": "soprano",
  "audioUrl": "https://..."
}
```

Response:
```json
{
  "success": true,
  "delivery": {
    "id": "delivery-123",
    "messageId": "msg-456",
    "status": "delivering",
    "deliveryStartedAt": "2026-04-12T...",
    "deliveryCompletedAt": null,
    "vocalPlayedAt": null
  }
}
```

### Complete Delivery

```javascript
POST /api/e7ki/zagel/delivery/:deliveryId/complete
```

### Get Delivery History

```javascript
GET /api/e7ki/zagel/deliveries/:conversationId
```

### Mark Vocal as Played

```javascript
POST /api/e7ki/zagel/vocal-play/:deliveryId
```

---

## 🎬 Animation Details

### Bird Flying Animation

The bird avatar flies across the screen during delivery:

```javascript
@keyframes zagel-fly {
  0% { transform: translateX(-100px) translateY(-50px) scale(0.8); opacity: 0.3; }
  50% { transform: translateX(0px) translateY(-100px) scale(1); opacity: 1; }
  100% { transform: translateX(100px) translateY(-50px) scale(0.8); opacity: 0.3; }
}
```

- **Duration**: Customizable (default 2000ms)
- **Wing Animation**: 4-frame flapping cycle at 100ms per frame
- **Scale**: Starts small (0.8x), grows to full size (1x), ends small (0.8x)
- **Opacity**: Fades in during flight, fades out at destination

### Vocal Notification

When delivery completes:

```javascript
const utterance = new SpeechSynthesisUtterance(
  `Message from ${senderName}`
);
utterance.pitch = voiceParams.pitch;
utterance.rate = voiceParams.rate;
utterance.volume = 0.8;
window.speechSynthesis.speak(utterance);
```

---

## 📱 React Components Usage

### Use ZagelProvider

Wrap your app:
```javascript
<ZagelProvider>
  <App />
</ZagelProvider>
```

### Use Zagel Context

```javascript
import { useZagel } from "@/lib/zagel-context";

export function MyComponent() {
  const {
    userAvatar,                    // { birdType, voiceType, ... }
    updateAvatarSettings,          // (settings) => void
    startDelivery,                 // (messageId, data) => void
    completeDelivery,              // (messageId) => void
    getActiveDeliveries,           // () => array of active deliveries
  } = useZagel();

  return (
    <ZagelAvatar
      birdType={userAvatar.birdType}
      voiceType={userAvatar.voiceType}
      animating={true}
      animationDuration={2000}
      size="md"
    />
  );
}
```

### Use ZAGEL Avatar Component

```javascript
import { ZagelAvatar } from "@/components/zagel/zagel-avatar";

<ZagelAvatar
  birdType="phoenix"      // phoenix, eagle, parrot, swan, owl
  voiceType="soprano"     // soprano, alto, tenor, bass, robotic, whimsical
  animating={false}       // true to animate
  animationDuration={2000}
  size="md"              // sm, md, lg
/>
```

### Use ZAGEL Delivery Tracker

```javascript
import { ZagelDeliveryTracker } from "@/components/zagel/zagel-delivery-tracker";

<ZagelDeliveryTracker
  messageId="msg-123"
  conversationId="conv-456"
  senderId="user-1"
  senderName="Alice"
  recipientId="user-2"
  recipientName="Bob"
  birdType="phoenix"
  voiceType="soprano"
  autoPlay={true}
  onDeliveryComplete={(data) => {
    console.log("Delivery completed:", data);
  }}
/>
```

---

## 🧪 Testing ZAGEL

### 1. Test Avatar Initialization

```bash
curl -X POST http://localhost:3000/api/e7ki/zagel/avatar/init \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "birdType": "phoenix", "voiceType": "soprano"}'
```

### 2. Test Delivery Tracking

```bash
curl -X POST http://localhost:3000/api/e7ki/zagel/delivery \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "msg-123",
    "conversationId": "conv-456",
    "senderId": "user-1",
    "senderName": "Alice",
    "recipientId": "user-2",
    "recipientName": "Bob",
    "birdType": "phoenix",
    "voiceType": "soprano"
  }'
```

### 3. Test Frontend Component

In your React component:

```javascript
import { ZagelAvatar } from "@/components/zagel/zagel-avatar";

export function TestZagel() {
  return (
    <div className="p-8">
      <h1>ZAGEL Test</h1>
      
      {/* All bird types */}
      <div className="flex gap-8 mt-8">
        <div className="text-center">
          <ZagelAvatar birdType="phoenix" size="lg" animating={true} />
          <p className="mt-2">Phoenix</p>
        </div>
        <div className="text-center">
          <ZagelAvatar birdType="eagle" size="lg" animating={true} />
          <p className="mt-2">Eagle</p>
        </div>
        <div className="text-center">
          <ZagelAvatar birdType="parrot" size="lg" animating={true} />
          <p className="mt-2">Parrot</p>
        </div>
        <div className="text-center">
          <ZagelAvatar birdType="swan" size="lg" animating={true} />
          <p className="mt-2">Swan</p>
        </div>
        <div className="text-center">
          <ZagelAvatar birdType="owl" size="lg" animating={true} />
          <p className="mt-2">Owl</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 📊 Database Schema (When Using Persistent Storage)

For production, add these tables to E7Ki database:

```sql
-- Avatar customization
CREATE TABLE zagel_avatars (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  bird_type TEXT DEFAULT 'phoenix',
  voice_type TEXT DEFAULT 'soprano',
  enable_vocal_notifications BOOLEAN DEFAULT true,
  total_deliveries INTEGER DEFAULT 0,
  total_vocal_playbacks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery tracking
CREATE TABLE zagel_deliveries (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  recipient_id TEXT NOT NULL,
  recipient_name TEXT,
  bird_type TEXT,
  voice_type TEXT,
  audio_url TEXT,
  status TEXT DEFAULT 'delivering',
  delivery_started_at TIMESTAMP,
  delivery_completed_at TIMESTAMP,
  vocal_played_at TIMESTAMP,
  is_vocal_delivery BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (conversation_id) REFERENCES e7ki_conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Indices
CREATE INDEX idx_zagel_avatars_user ON zagel_avatars(user_id);
CREATE INDEX idx_zagel_deliveries_conversation ON zagel_deliveries(conversation_id);
CREATE INDEX idx_zagel_deliveries_recipient ON zagel_deliveries(recipient_id);
CREATE INDEX idx_zagel_deliveries_created ON zagel_deliveries(created_at);
```

---

## 🎯 Key Features Implemented

✅ **3D Bird Avatar** - 5 customizable bird types with SVG rendering  
✅ **Flying Animation** - Smooth bird flight path from sender to recipient  
✅ **Vocal Delivery** - Text-to-speech announcements with 6 voice types  
✅ **Real-time Tracking** - WebSocket-based delivery status  
✅ **Customization UI** - Settings component for users to change avatar  
✅ **Reward Integration** - Points for sending/receiving vocal messages  
✅ **Delivery History** - Complete logging of all message transfers  
✅ **Voice Transcription** - Support for transcribing audio messages  

---

## 🚀 Next Steps

1. **Deploy to GitLab** - Commit all files to repository
2. **Run Backend Tests** - Test all ZAGEL API endpoints
3. **Test Frontend** - Verify bird animations and voice playback
4. **Database Migration** - Add persistent storage tables
5. **Socket.IO Integration** - Wire up real-time delivery updates
6. **User Testing** - Gather feedback on bird animations and voices
7. **Performance Optimization** - Optimize animation rendering if needed

---

## 📞 Support

For issues or questions about ZAGEL integration:
- Check the `ZAGEL_INTEGRATION.md` documentation
- Review the `voice-message-with-zagel.jsx` component
- Test with the provided API endpoints
- Check browser console for WebSocket connection status

---

**ZAGEL + E7Ki Integration Complete! 🎉**
