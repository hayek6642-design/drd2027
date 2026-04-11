-- Games Centre Database Schema
-- Tables for tracking games, plays, bets, and rewards

-- Game plays tracking
CREATE TABLE IF NOT EXISTS game_plays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    result BOOLEAN DEFAULT FALSE,
    reward INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email) REFERENCES users(email)
);

-- Game bets tracking (for gambling system)
CREATE TABLE IF NOT EXISTS game_bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    bet_amount INTEGER NOT NULL,
    odds DECIMAL(5,2) DEFAULT 1.0,
    prediction VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    payout INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    FOREIGN KEY (email) REFERENCES users(email)
);

-- Asset rewards tracking
CREATE TABLE IF NOT EXISTS asset_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL,
    asset_type VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL,
    source VARCHAR(50),
    reason TEXT,
    rewarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email) REFERENCES users(email)
);

-- Game achievements/badges
CREATE TABLE IF NOT EXISTS game_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) NOT NULL,
    achievement_type VARCHAR(100) NOT NULL,
    game_type VARCHAR(50),
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(email, achievement_type),
    FOREIGN KEY (email) REFERENCES users(email)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_game_plays_email ON game_plays(email);
CREATE INDEX IF NOT EXISTS idx_game_plays_game ON game_plays(game_type);
CREATE INDEX IF NOT EXISTS idx_game_plays_date ON game_plays(played_at);

CREATE INDEX IF NOT EXISTS idx_game_bets_email ON game_bets(email);
CREATE INDEX IF NOT EXISTS idx_game_bets_status ON game_bets(status);
CREATE INDEX IF NOT EXISTS idx_game_bets_date ON game_bets(created_at);

CREATE INDEX IF NOT EXISTS idx_asset_rewards_email ON asset_rewards(email);
CREATE INDEX IF NOT EXISTS idx_asset_rewards_date ON asset_rewards(rewarded_at);

CREATE INDEX IF NOT EXISTS idx_achievements_email ON game_achievements(email);