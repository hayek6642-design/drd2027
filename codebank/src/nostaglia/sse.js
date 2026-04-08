// sse.js
let eventSource;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

const attemptReconnect = (userId, callback) => {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
    setTimeout(() => setupSSE(userId, callback), RECONNECT_DELAY);
  } else {
    console.error('Max reconnection attempts reached');
  }
};

export const setupSSE = (userId, callback) => {
  eventSource = new EventSource(`/api/nostaglia/sse?userId=${userId}`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
    // Reset reconnect attempts on successful message
    reconnectAttempts = 0;
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    if (eventSource.readyState === EventSource.CLOSED) {
      console.log('SSE connection closed, attempting to reconnect...');
      attemptReconnect(userId, callback);
    }
  };
};

export const closeSSE = () => {
  if (eventSource) {
    eventSource.close();
    reconnectAttempts = 0; // Reset reconnect attempts when manually closed
  }
};