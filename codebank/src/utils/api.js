/**
 * API utilities for CodeBank frontend
 */

// Fetch with JWT token support
export const fetchJson = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  const response = await fetch(url, { ...options, headers, credentials: 'include' })
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  return response.json()
}

// Get cookie value by name
export const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

// SSE hook for React components
export const useSSE = (channel, callback, token = null) => {
  React.useEffect(() => {
    const eventSource = new EventSource(`/api/logicode/events/stream?channel=${encodeURIComponent(channel)}`)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (callback) callback(data)
      } catch (err) {
        console.error('SSE parse error:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE error:', err)
    }

    return () => eventSource.close()
  }, [channel, callback, token])
}

// Local storage for pending rewards (offline sync)
export const PendingRewards = {
  // Add pending reward
  add: (reward) => {
    const pending = JSON.parse(localStorage.getItem('pendingRewards') || '[]')
    pending.push({
      ...reward,
      timestamp: Date.now(),
      id: Math.random().toString(36)
    })
    localStorage.setItem('pendingRewards', JSON.stringify(pending))
  },

  // Get all pending rewards
  getAll: () => {
    return JSON.parse(localStorage.getItem('pendingRewards') || '[]')
  },

  // Clear pending rewards
  clear: () => {
    localStorage.removeItem('pendingRewards')
  },

  // Sync pending rewards to server
  sync: async (token = null) => {
    const pending = PendingRewards.getAll()
    if (pending.length === 0) return

    try {
      const response = await fetchWithToken('/api/rewards/sync', {
        method: 'POST',
        body: JSON.stringify({
          events: pending.map(p => ({
            amount: p.amount,
            source: p.source,
            created_at: new Date(p.timestamp).toISOString(),
            meta: p.meta || {}
          }))
        })
      }, token)

      if (response.ok) {
        PendingRewards.clear()
        console.log('Successfully synced pending rewards')
      }
    } catch (error) {
      console.error('Failed to sync pending rewards:', error)
    }
  }
}

// Reward claiming helper
export const claimReward = async (rewardData, token = null) => {
  try {
    const response = await fetchWithToken('/api/rewards/claim', {
      method: 'POST',
      body: JSON.stringify(rewardData)
    }, token)

    return response
  } catch (error) {
    console.error('Reward claim failed:', error)
    throw error
  }
}

// Get user balance
export const getUserBalance = async (token = null) => {
  try {
    const response = await fetchWithToken('/api/rewards/balance', {}, token)
    return response
  } catch (error) {
    console.error('Failed to get user balance:', error)
    throw error
  }
}

// Redeem corsa code
export const redeemCorsaCode = async (code, token = null) => {
  try {
    const response = await fetchWithToken('/api/corsa/redeem', {
      method: 'POST',
      body: JSON.stringify({ code })
    }, token)

    return response
  } catch (error) {
    console.error('Corsa code redemption failed:', error)
    throw error
  }
}

// Submit game score
export const submitGameScore = async (gameName, score, token = null) => {
  try {
    const response = await fetchWithToken('/api/games/scores', {
      method: 'POST',
      body: JSON.stringify({ game_name: gameName, score })
    }, token)

    return response
  } catch (error) {
    console.error('Game score submission failed:', error)
    throw error
  }
}

// Asset actions
export const performAssetAction = async (action, assetId, token = null) => {
  try {
    const response = await fetchWithToken(`/api/assets/${action}/${assetId}`, {
      method: 'POST'
    }, token)

    return response
  } catch (error) {
    console.error(`Asset ${action} failed:`, error)
    throw error
  }
}
