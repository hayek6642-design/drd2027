#!/bin/bash

# Build all React games
GAMES=(
    "ChessNexus"
    "TrialSurvival"
    "CasinoSim"
    "CryptoVegas"
    "ExecuteAllGame"
    "GreedSatisfaction"
    "GameChatConnect"
)

for game in "${GAMES[@]}"; do
    echo "Building $game..."
    cd "react-games/$game"
    
    # Install dependencies
    npm install
    
    # Build the game
    npm run build
    
    # Go back to the Games-Centre directory
    cd ../..
done

echo "All React games have been built successfully!"
