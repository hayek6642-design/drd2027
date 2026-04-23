import React, { useState, useEffect } from 'react'

const GameLeaderboard = ({ gameName, token }) => {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch initial leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/logicode/leaderboard?game_name=${encodeURIComponent(gameName)}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : undefined,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch leaderboard')
      
      const data = await response.json()
      setScores(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // SSE subscription for real-time updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/logicode/events/stream?channel=game:${encodeURIComponent(gameName)}`)
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.event === 'score') {
        // Update scores list with new score
        setScores(prevScores => {
          const existingIndex = prevScores.findIndex(s => s.user_id === data.data.user_id)
          if (existingIndex >= 0) {
            // Update existing score if higher
            if (data.data.score > prevScores[existingIndex].score) {
              const newScores = [...prevScores]
              newScores[existingIndex] = { ...prevScores[existingIndex], score: data.data.score }
              return newScores.sort((a, b) => b.score - a.score)
            }
          } else {
            // Add new score
            return [...prevScores, data.data].sort((a, b) => b.score - a.score)
          }
          return prevScores
        })
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE error:', err)
    }

    // Initial fetch
    fetchLeaderboard()

    return () => eventSource.close()
  }, [gameName, token])

  if (loading) return <div className="text-center py-4">Loading leaderboard...</div>
  if (error) return <div className="text-red-500 text-center py-4">Error: {error}</div>

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4">🏆 {gameName} Leaderboard</h3>
      {scores.length === 0 ? (
        <p className="text-gray-500 text-center">No scores yet. Be the first!</p>
      ) : (
        <div className="space-y-2">
          {scores.slice(0, 10).map((score, index) => (
            <div key={score.user_id} className="flex justify-between items-center p-2 border-b">
              <div className="flex items-center space-x-3">
                <span className={`font-bold w-6 ${index < 3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                  #{index + 1}
                </span>
                <span className="font-medium">{score.display_name || 'Anonymous'}</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{score.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default GameLeaderboard