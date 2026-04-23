# Example: Integrating Zagel into Your Existing Code Bank

## Step 1: Add Container to HTML

In your `yt-new-clear.html`, add this at the very bottom (before closing `</body>`):

```html
<!-- Zagel Avatar System Container -->
<div id="zagel-avatar-root" style="
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: none;
">
  <script>
    // Wait for Zagel system to be available
    window.zagelReady = false;
    window.addEventListener('DOMContentLoaded', () => {
      console.log('🕊️ Zagel Avatar System loaded');
      window.zagelReady = true;
    });
  </script>
</div>
```

---

## Step 2: Emit Triggers When Updates Arrive

### For New Messages

When your messaging system receives a new message:

```javascript
function onNewMessage(message) {
  // Your existing code...
  console.log('New message:', message);
  
  // Emit Zagel trigger
  if (window.zagelReady) {
    window.dispatchEvent(new CustomEvent('zagel:new-message', {
      detail: {
        title: `New message from ${message.sender}`,
        description: message.preview || message.text.substring(0, 50)
      }
    }));
  }
}
```

### For New Videos

When a new video is uploaded or available:

```javascript
function onNewVideo(video) {
  // Your existing code...
  
  if (window.zagelReady) {
    window.dispatchEvent(new CustomEvent('zagel:new-video', {
      detail: {
        title: video.title,
        description: `${video.duration} - ${video.views} views`
      }
    }));
  }
}
```

### For New Products (Pebalaash)

When new products are available:

```javascript
function onNewProduct(product) {
  // Your existing code...
  
  if (window.zagelReady) {
    window.dispatchEvent(new CustomEvent('zagel:new-product', {
      detail: {
        title: product.name,
        description: `${product.price} - ${product.category}`
      }
    }));
  }
}
```

### For News Updates

When news or announcements arrive:

```javascript
function onNewsUpdate(news) {
  // Your existing code...
  
  if (window.zagelReady) {
    window.dispatchEvent(new CustomEvent('zagel:new-news', {
      detail: {
        title: news.headline,
        description: news.summary || news.source
      }
    }));
  }
}
```

### For New Code Snippets

When new code is added to the bank:

```javascript
function onNewCode(codeItem) {
  // Your existing code...
  
  if (window.zagelReady) {
    window.dispatchEvent(new CustomEvent('zagel:new-code', {
      detail: {
        title: codeItem.name || 'New Code Snippet',
        description: `Language: ${codeItem.language}, Lines: ${codeItem.lines}`
      }
    }));
  }
}
```

---

## Step 3: Integrate into Your API Response Handlers

### WebSocket Example

```javascript
// In your WebSocket connection handler
socket.on('message', (data) => {
  // Process message
  addMessageToUI(data);
  
  // Notify Zagel
  if (window.zagelReady && document.hidden) {
    window.dispatchEvent(new CustomEvent('zagel:new-message', {
      detail: {
        title: `Message from ${data.sender}`,
        description: data.content.substring(0, 50)
      }
    }));
  }
});

socket.on('video-upload', (video) => {
  addVideoToUI(video);
  
  if (window.zagelReady) {
    window.dispatchEvent(new CustomEvent('zagel:new-video', {
      detail: {
        title: video.title,
        description: `Uploaded ${new Date().toLocaleDateString()}`
      }
    }));
  }
});

socket.on('product-available', (product) => {
  updateProductDisplay(product);
  
  if (window.zagelReady) {
    window.dispatchEvent(new CustomEvent('zagel:new-product', {
      detail: {
        title: product.name,
        description: `Sale Price: ${product.salePrice}`
      }
    }));
  }
});
```

### Fetch/Async Example

```javascript
async function pollForUpdates() {
  try {
    const response = await fetch('/api/updates');
    const updates = await response.json();
    
    updates.forEach(update => {
      const eventType = `zagel:new-${update.type}`;
      
      if (window.zagelReady && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent(eventType, {
          detail: {
            title: update.title,
            description: update.description
          }
        }));
      }
      
      // Process update in your app
      processUpdate(update);
    });
  } catch (error) {
    console.error('Error polling updates:', error);
  }
}

// Poll every 30 seconds
setInterval(pollForUpdates, 30000);
```

---

## Step 4: Handle Zagel Navigation

When Zagel flies to the main page to show updates:

```javascript
// Listen for Zagel navigation events
window.addEventListener('zagel:navigate-to-main', () => {
  console.log('Zagel is navigating to main page');
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Show updates section
  const updatesSection = document.getElementById('updates-section');
  if (updatesSection) {
    updatesSection.scrollIntoView({ behavior: 'smooth' });
  }
});
```

---

## Step 5: Custom Zagel Messaging

Add voice feedback when Zagel is activated:

```javascript
// Listen for Zagel initialization
window.addEventListener('zagel:initialized', () => {
  console.log('🕊️ Zagel has been activated');
  
  // You could trigger your own TTS here
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(
      'I am Zagel, your personal notification assistant. I will keep you updated on messages, videos, products, and news.'
    );
    speechSynthesis.speak(utterance);
  }
});
```

---

## Step 6: Integration in Your Existing Functions

### Update Your Message Handler

**Before:**
```javascript
function handleNewMessage(message) {
  addMessageToChat(message);
  updateMessageCount();
}
```

**After:**
```javascript
function handleNewMessage(message) {
  addMessageToChat(message);
  updateMessageCount();
  
  // Zagel notification
  if (window.zagelReady) {
    window.dispatchEvent(new CustomEvent('zagel:new-message', {
      detail: {
        title: `Message from ${message.sender}`,
        description: message.text.substring(0, 50)
      }
    }));
  }
}
```

---

## Step 7: Test Your Integration

### Test 1: Manual Trigger

Open browser console and run:

```javascript
// Test message
window.dispatchEvent(new CustomEvent('zagel:new-message', {
  detail: {
    title: 'Test Message',
    description: 'This is a test notification'
  }
}));

// Test video
window.dispatchEvent(new CustomEvent('zagel:new-video', {
  detail: {
    title: 'Test Video Upload',
    description: '5:32 duration'
  }
}));

// Test product
window.dispatchEvent(new CustomEvent('zagel:new-product', {
  detail: {
    title: 'New Product Available',
    description: 'Limited Edition - On Sale'
  }
}));

// Test news
window.dispatchEvent(new CustomEvent('zagel:new-news', {
  detail: {
    title: 'Breaking News',
    description: 'New Features Released'
  }
}));
```

### Test 2: Voice Command

1. Click the Zagel avatar
2. Wait for initialization
3. Say "yes Zagel, come in"
4. Check if app responds

### Test 3: Background Notification

1. Load the app
2. Click Zagel avatar
3. Minimize the browser window
4. Run a trigger event in console
5. Listen for door-knock sound

---

## Step 8: Production Checklist

- [ ] Zagel container added to HTML
- [ ] All trigger events emitting correctly
- [ ] Voice commands working (test with multiple phrases)
- [ ] Sounds playing at appropriate times
- [ ] Mobile responsiveness tested
- [ ] Voice recognition permissions set up
- [ ] HTTPS enabled (required for microphone)
- [ ] Toast notifications positioned correctly
- [ ] No console errors
- [ ] Performance tested (animations smooth)

---

## Advanced: Custom Event Types

If you need to add custom trigger types, extend the system:

```javascript
// Dispatch a custom update event
window.dispatchEvent(new CustomEvent('zagel:new-update', {
  detail: {
    title: 'Custom Event',
    description: 'Your custom update message'
  }
}));
```

---

## Troubleshooting Integration

### Events Not Firing

Check that Zagel is ready:
```javascript
if (!window.zagelReady) {
  console.warn('Zagel not ready yet, waiting...');
  
  // Retry after 1 second
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('zagel:new-message', {
      detail: { title: 'Test', description: 'Retry' }
    }));
  }, 1000);
}
```

### Avatar Not Visible

```javascript
const container = document.getElementById('zagel-avatar-root');
console.log('Container found:', !!container);
console.log('Zagel ready:', window.zagelReady);
```

### Voice Not Working

```javascript
const recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!recognition) {
  console.error('Speech Recognition not supported in this browser');
} else {
  console.log('Speech Recognition available');
}
```

---

## Next Steps

1. Implement trigger events in your API response handlers
2. Test each update type (message, video, product, news, code)
3. Customize colors and sounds to match your brand
4. Train your team on Zagel's capabilities
5. Gather user feedback for improvements

**🕊️ Zagel is now integrated into your Code Bank!**
