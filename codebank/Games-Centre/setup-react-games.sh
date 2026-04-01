#!/bin/bash

# Function to install dependencies and build a React game
build_game() {
    local game_dir=$1
    echo "Setting up $game_dir..."
    
    cd "react-games/$game_dir" || return
    
    # Install dependencies
    echo "Installing dependencies for $game_dir..."
    npm install

    # Create or update vite.config.ts if it doesn't exist
    if [ ! -f "vite.config.ts" ]; then
        echo "Creating vite.config.ts for $game_dir..."
        cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    base: './',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            output: {
                manualChunks: undefined
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        port: 3000,
        host: true
    }
});
EOF
    fi

    # Build the game
    echo "Building $game_dir..."
    npm run build

    # Go back to Games-Centre directory
    cd ../..
}

# Install global dependencies
echo "Installing global dependencies..."
npm install -g typescript vite @vitejs/plugin-react

# Create assets directory if it doesn't exist
mkdir -p assets/images

# Create placeholder images for games that don't have them
declare -A game_images=(
    ["ChessNexus"]="chess-nexus.jpg"
    ["TrialSurvival"]="trial-survival.jpg"
    ["CasinoSim"]="casino-sim.jpg"
    ["CryptoVegas"]="crypto-vegas.jpg"
    ["ExecuteAllGame"]="execute-all.jpg"
    ["GreedSatisfaction"]="greed-satisfaction.jpg"
    ["GameChatConnect"]="game-chat.jpg"
)

for game in "${!game_images[@]}"; do
    image_path="assets/images/${game_images[$game]}"
    if [ ! -f "$image_path" ]; then
        # Create a placeholder image using a base64 encoded 1x1 pixel
        echo "Creating placeholder image for $game..."
        echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==" | base64 --decode > "$image_path"
    fi
done

# Build each React game
echo "Building React games..."
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
    build_game "$game"
done

echo "All React games have been set up and built successfully!"
