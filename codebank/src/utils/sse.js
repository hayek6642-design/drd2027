import React from 'react'

/**
 * Custom hook for Server-Sent Events (SSE)
 * Provides real-time updates for various channels
 */

export const useSSE = (channel, callback, token = null) => {
  React.useEffect(() => {
    let eventSource = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 1000

    const connect = () => {
      if (eventSource) {
        eventSource.close()
      }

      const url = new URL(`/api/logicode/events/stream`, window.location.origin)
      url.searchParams.set('channel', channel)

      if (token) {
        url.searchParams.set('token', token)
      }

      eventSource = new EventSource(url.toString())

      eventSource.onopen = () => {
        reconnectAttempts = 0
        console.log(`SSE connected to channel: ${channel}`)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (callback) {
            callback(data)
          }
        } catch (err) {
          console.error('SSE parse error:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('SSE error:', err)
        
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          console.log(`SSE reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`)
          setTimeout(connect, reconnectDelay * reconnectAttempts)
        } else {
          console.error('SSE max reconnection attempts reached')
        }
      }
    }

    connect()

    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [channel, callback, token])
}

/**
 * SSE Manager for multiple channels
 */
export class SSEManager {
  constructor() {
    this.connections = new Map()
    this.callbacks = new Map()
  }

  subscribe(channel, callback) {
    if (!this.callbacks.has(channel)) {
      this.callbacks.set(channel, new Set())
    }
    this.callbacks.get(channel).add(callback)

    if (!this.connections.has(channel)) {
      this.connect(channel)
    }
  }

  unsubscribe(channel, callback) {
    if (this.callbacks.has(channel)) {
      this.callbacks.get(channel).delete(callback)
      
      if (this.callbacks.get(channel).size === 0) {
        this.callbacks.delete(channel)
        this.disconnect(channel)
      }
    }
  }

  connect(channel) {
    const url = new URL(`/api/logicode/events/stream`, window.location.origin)
    url.searchParams.set('channel', channel)

    const eventSource = new EventSource(url.toString())
    this.connections.set(channel, eventSource)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const callbacks = this.callbacks.get(channel)
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(data)
            } catch (err) {
              console.error('SSE callback error:', err)
            }
          })
        }
      } catch (err) {
        console.error('SSE parse error:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error(`SSE error for channel ${channel}:`, err)
      this.connections.delete(channel)
    }
  }

  disconnect(channel) {
    const eventSource = this.connections.get(channel)
    if (eventSource) {
      eventSource.close()
      this.connections.delete(channel)
    }
  }

  disconnectAll() {
    this.connections.forEach((eventSource, channel) => {
      eventSource.close()
    })
    this.connections.clear()
    this.callbacks.clear()
  }
}

/**
 * Predefined SSE channels
 */
export const SSE_CHANNELS = {
  WEALTH: 'wealth',
  GAME: (gameName) => `game:${gameName}`,
  ASSETS: 'assets',
  GLOBAL: 'global'
}

/**
 * Wealth balance SSE hook
 */
export const useWealthUpdates = (callback, token = null) => {
  useSSE(SSE_CHANNELS.WEALTH, callback, token)
}

/**
 * Game score SSE hook
 */
export const useGameUpdates = (gameName, callback, token = null) => {
  useSSE(SSE_CHANNELS.GAME(gameName), callback, token)
}

/**
 * Assets SSE hook
 */
export const useAssetUpdates = (callback, token = null) => {
  useSSE(SSE_CHANNELS.ASSETS, callback, token)
}

/**
 * Global SSE hook
 */
export const useGlobalUpdates = (callback, token = null) => {
  useSSE(SSE_CHANNELS.GLOBAL, callback, token)
}