# Zagel Command Wheel - Server Integration Guide

## Overview

The Zagel Command Wheel requires backend integration for:
1. **SSE Endpoints** - Real-time event streaming for all services
2. **API Routes** - Message, mail, asset, and transaction endpoints  
3. **Event Bridge** - Connect Zagel events to bankode-core and other systems
4. **Authentication** - Integrate with existing auth middleware

## Files Created

- `api/routes/zagel.js` - All Zagel API endpoints and SSE streaming
- `api/routes/zagel-events.js` - Event bridge connecting Zagel to other systems

## Integration Steps

### 1. Update `server.js`

Add these imports at the top:

```javascript
import zagelRouter from './api/routes/zagel.js';
import { setupZagelEventBridge } from './api/routes/zagel-events.js';
```

Mount the routes before other middleware:

```javascript
// Zagel Command Wheel
app.use('/api/sse', zagelRouter);
app.use('/api/e7ki', zagelRouter);
app.use('/api/mail', zagelRouter);
app.use('/api/farragna', zagelRouter);
app.use('/api/pebalaash', zagelRouter);
app.use('/api/assets', zagelRouter);
app.use('/api/battalooda', zagelRouter);
app.use('/api/sms', zagelRouter);
app.use('/api/zagel', zagelRouter);
```

Initialize the event bridge after Express setup:

```javascript
setupZagelEventBridge(app, io); // io is optional (Socket.IO instance)
```

### 2. Add Zagel HTML to CodeBank

In `codebank/bankode/index.html`, before closing `</body>`:

```html
<!-- Zagel Command Wheel -->
<iframe id="zagel-wheel" 
        src="/zagel-wheel-integrated.html" 
        style="position:fixed;bottom:20px;right:20px;width:400px;height:400px;border:none;z-index:9999;border-radius:20px;box-shadow:0 8px 16px rgba(0,0,0,0.1);">
</iframe>
```

### 3. Serve the Zagel HTML

Add to `server.js`:

```javascript
app.use('/zagel-wheel-integrated.html', express.static(
  path.join(__dirname, 'public/zagel-wheel-integrated.html')
));
```

Or serve it from `codebank/` if that's where you store it.

### 4. Configure CORS (if needed)

The SSE endpoints allow `Access-Control-Allow-Origin: *`. For stricter CORS, update the middleware in `api/routes/zagel.js`:

```javascript
res.setHeader('Access-Control-Allow-Origin', 'https://yourdomain.com');
```

## API Endpoint Reference

### SSE Streaming

```
GET /api/sse/:channel
Headers: Authorization: Bearer {session_token}
Channels: e7ki, farragna, pebalaash, assets, notifications

Response: Server-sent events (text/event-stream)
```

### E7KI (Messaging)

```
GET    /api/e7ki/messages             - Get messages
POST   /api/e7ki/send                 - Send message
PUT    /api/e7ki/messages/:id/read    - Mark as read
```

### Mail

```
GET    /api/mail/check                - Check unread count
GET    /api/mail/list                 - List emails
PUT    /api/mail/:id/read             - Mark as read
```

### Farragna (Dating/Social)

```
GET    /api/farragna/activity         - Get activity
POST   /api/farragna/like/:userId     - Send like
POST   /api/farragna/match/:userId    - Accept match
```

### Pebalaash (Bartering)

```
GET    /api/pebalaash/offers          - Get offers
POST   /api/pebalaash/offer           - Create offer
POST   /api/pebalaash/offer/:id/match - Match with offer
```

### Assets (SafeCode)

```
GET    /api/assets/snapshot           - Get asset snapshot
POST   /api/assets/code-generate      - Generate code
PUT    /api/assets/apply/:code        - Apply/redeem code
```

### Battalooda (Studio)

```
POST   /api/battalooda/recording/start  - Start recording
POST   /api/battalooda/recording/stop/:id - Stop recording
```

### SMS & Phone

```
GET    /api/sms/messages              - Get SMS list
POST   /api/sms/send                  - Send SMS
```

### System

```
GET    /api/zagel/status              - Get Zagel status
POST   /api/zagel/broadcast           - Broadcast event (admin only)
```

## PostMessage Protocol

Zagel communicates with service iframes via `postMessage`. Services should listen for:

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'zagel:command') {
    const { action, target, data } = event.data;
    
    // Handle command
    // ...
    
    // Send response
    event.source.postMessage({
      type: 'service:response',
      target: 'zagel',
      data: { /* result */ }
    }, event.origin);
  }
});
```

## Real-time Event Flow

1. **Client Action** → E7KI sends a message
2. **API Route** → `/api/e7ki/send` creates message and emits event
3. **Event Bridge** → `zagelEvents.emit('e7ki:message', data)`
4. **SSE Broadcast** → `broadcastToChannel('e7ki', data)`
5. **Zagel Client** → Receives via SSE stream, shows notification
6. **AssetBus** → (Optional) Passes event to other services

## Database Integration

Currently, the routes use **mock data**. To integrate with real data:

1. Replace mock data with actual DB queries (MongoDB, PostgreSQL, etc.)
2. Example for E7KI messages:

```javascript
router.get('/e7ki/messages', requireAuth, async (req, res) => {
  const messages = await db.collection('messages')
    .find({ userId: req.user.id })
    .sort({ timestamp: -1 })
    .limit(50)
    .toArray();
  
  res.json({ success: true, data: messages });
});
```

3. Use the same pattern for all other endpoints

## Testing

### Test SSE Connection

```bash
curl -H "Authorization: Bearer <token>" \
  https://your-site.com/api/sse/e7ki
```

You should see:
```
data: {"type":"connected","channel":"e7ki","userId":"user-123","timestamp":1234567890}
```

### Test Event Broadcasting

```bash
curl -X POST https://your-site.com/api/e7ki/send \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"user-456","content":"Hello!"}'
```

### Test Zagel Status

```bash
curl https://your-site.com/api/zagel/status
```

Response:
```json
{
  "online": true,
  "channels": {
    "e7ki": 3,
    "farragna": 1,
    "pebalaash": 0,
    "assets": 2,
    "notifications": 5
  },
  "totalClients": 11,
  "uptime": 3600,
  "timestamp": 1234567890
}
```

## Performance Considerations

- **SSE Scaling**: Each client maintains an open TCP connection. For 1000+ concurrent users, consider:
  - Using a message queue (Redis, RabbitMQ) instead of in-memory Sets
  - Implementing connection pooling
  - Using a dedicated SSE server

- **Event Deduplication**: Events are not deduplicated. Add logic to prevent duplicate broadcasts if needed.

- **Memory**: In-memory `sseClients` Set grows with connections. Implement cleanup for dropped connections (currently done on 'close' event).

## Troubleshooting

**SSE Not Connecting**
- Check browser console for CORS errors
- Verify `Authorization` header is sent
- Ensure server supports chunked transfer encoding

**Events Not Broadcasting**
- Check server logs for `[SSE] Broadcasted` messages
- Verify clients are in the correct channel Set
- Check if write errors are being caught and logged

**Memory Leaks**
- Monitor SSE client count with `/api/zagel/status`
- Check for clients stuck in disconnected state
- Implement periodic cleanup of dead connections

## Next Steps

1. ✅ Mount routes in `server.js`
2. ✅ Add Zagel HTML to CodeBank UI
3. ⏳ Connect to actual database (replace mock data)
4. ⏳ Set up Redis for distributed SSE (if scaling)
5. ⏳ Implement rate limiting on API endpoints
6. ⏳ Add logging/monitoring dashboard
