/**
 * Zagel Events Bridge
 * Connects Zagel events to the bankode-core AssetBus
 * and other backend event systems
 */

import { zagelEvents, broadcastToChannel } from './zagel.js';

export function setupZagelEventBridge(app, io = null) {
  // Listen to all Zagel events and log them
  zagelEvents.on('*', (eventName, data) => {
    console.log(`[Zagel Event] ${eventName}:`, data);
  });

  // ============================================
  // E7KI Events
  // ============================================
  
  zagelEvents.on('e7ki:message', (message) => {
    console.log('[Event] New E7Ki message:', message.id);
    
    // Broadcast to WebSocket clients if available
    if (io) {
      io.emit('e7ki:message', message);
    }
    
    // Broadcast to SSE clients
    broadcastToChannel('e7ki', {
      type: 'e7ki:message',
      data: message,
      timestamp: Date.now()
    });
  });

  // ============================================
  // FARRAGNA Events
  // ============================================
  
  zagelEvents.on('farragna:like', (event) => {
    console.log('[Event] Farragna like:', event.id);
    if (io) io.emit('farragna:like', event);
    broadcastToChannel('farragna', {
      type: 'farragna:like',
      data: event,
      timestamp: Date.now()
    });
  });

  zagelEvents.on('farragna:match', (event) => {
    console.log('[Event] Farragna match:', event.id);
    if (io) io.emit('farragna:match', event);
    broadcastToChannel('farragna', {
      type: 'farragna:match',
      data: event,
      timestamp: Date.now()
    });
  });

  // ============================================
  // PEBALAASH Events
  // ============================================
  
  zagelEvents.on('pebalaash:offer', (offer) => {
    console.log('[Event] New Pebalaash offer:', offer.id);
    if (io) io.emit('pebalaash:offer', offer);
    broadcastToChannel('pebalaash', {
      type: 'pebalaash:offer',
      data: offer,
      timestamp: Date.now()
    });
  });

  // ============================================
  // BANKODE/ASSETS Events
  // ============================================
  
  zagelEvents.on('bankode:code-generated', (asset) => {
    console.log('[Event] Code generated:', asset.code);
    if (io) io.emit('bankode:code-generated', asset);
    broadcastToChannel('assets', {
      type: 'bankode:code-generated',
      data: asset,
      timestamp: Date.now()
    });
  });

  // ============================================
  // BATTALOODA Events
  // ============================================
  
  zagelEvents.on('battalooda:recording', (session) => {
    console.log('[Event] Recording started:', session.id);
    if (io) io.emit('battalooda:recording', session);
    broadcastToChannel('notifications', {
      type: 'battalooda:recording',
      data: session,
      timestamp: Date.now()
    });
  });

  console.log('[Zagel] Event bridge initialized');
}

export { zagelEvents };
