'use client'
import React, { useEffect, useState, useRef } from 'react'

export default function WealthLeaderboard({ token, limit = 50 }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const esRef = useRef(null)

  // Fetch initial leaderboard
  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/logicode/wealth-leaderboard?limit=${limit}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: !token ? 'include' : undefined
      })
      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      const data = await res.json()
      setUsers(data)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError(err.message)
      setLoading(false)
    }
  }

  // SSE listener for live updates using custom hook
  useEffect(() => {
    const channel = 'wealth'
    const url = `/api/logicode/events/stream?channel=${channel}`
    const options = { withCredentials: !token }

    esRef.current = new EventSource(url, options)

    esRef.current.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data)
        if (parsed.event === 'balance') {
          const { user_id, delta, new_balance } = parsed.data
          setUsers((prev) => {
            const idx = prev.findIndex(u => u.user_id === user_id)
            if (idx >= 0) {
              const updated = [...prev]
              updated[idx] = { ...updated[idx], balance: new_balance }
              return updated.sort((a,b) => b.balance - a.balance)
            } else {
              // If new user, add
              return [...prev, { user_id, username: `User ${user_id.slice(0,6)}`, balance: new_balance }].sort((a,b) => b.balance - a.balance)
            }
          })
        }
      } catch (e) {
        console.warn('SSE parsing error:', e)
      }
    }

    esRef.current.onerror = (err) => {
      console.warn('SSE connection error:', err)
      esRef.current.close()
    }

    // Fetch initial
    fetchLeaderboard()

    return () => esRef.current?.close()
  }, [token])

  if (loading) return <div className="p-4">Loading leaderboard...</div>
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-2">Wealth Leaderboard</h2>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th className="px-2 py-1">#</th>
            <th className="px-2 py-1">Username</th>
            <th className="px-2 py-1">Balance</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr key={u.user_id} className={idx < 3 ? 'font-bold bg-yellow-50' : ''}>
              <td className="px-2 py-1">{idx+1}</td>
              <td className="px-2 py-1">{u.username || 'Anonymous'}</td>
              <td className="px-2 py-1">{u.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
