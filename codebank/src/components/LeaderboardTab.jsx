import React from 'react'
import GameLeaderboard from './GameLeaderboard'
import WealthLeaderboard from './WealthLeaderboard'

const LeaderboardTab = ({ token }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game Leaderboard */}
        <div>
          <GameLeaderboard gameName="tetris" token={token} />
        </div>
        
        {/* Wealth Leaderboard */}
        <div>
          <WealthLeaderboard token={token} />
        </div>
      </div>

      {/* Additional Game Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GameLeaderboard gameName="snake" token={token} />
        <GameLeaderboard gameName="pong" token={token} />
        <GameLeaderboard gameName="racing" token={token} />
      </div>
    </div>
  )
}

export default LeaderboardTab