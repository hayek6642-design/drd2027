#!/bin/bash

# Script to add game integration to games that are missing it

GAMES_DIR="services/yt-clear/codebank/Games-Centre/games/vanilla"
GAMES_MISSING_INTEGRATION=(
    "pubgy-kids/pk.js"
    "dominos/do.js"
    "solitaire/so.js"
    "car_race/c_r.js"
    "chess-nexus/game.js"
    "river-raid/rr.js"
    "billiard/bi.js"
    "snake&ladder1/s_l1.js"
)

# Game integration template
INTEGRATION_TEMPLATE='// ========================================
// Game Integration - Auto-added
// ========================================
(function() {
    const gameIntegration = window.gameIntegration;
    if (!gameIntegration) {
        console.warn("[Game] gameIntegration not available");
        return;
    }

    // Notify dashboard game is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            gameIntegration.ready();
        });
    } else {
        gameIntegration.ready();
    }

    // Track when game should end
    // You may need to manually call gameIntegration.gameOver({ score: X, won: true/false })
    // when your game ends
    console.log("[Game] Integration active - remember to call gameIntegration.gameOver() when game ends");
})();'

echo "Adding game integration to missing games..."

for game_path in "${GAMES_MISSING_INTEGRATION[@]}"; do
    game_file="$GAMES_DIR/$game_path"
    echo "Processing $game_file..."

    # Check if the file exists
    if [ -f "$game_file" ]; then
        # Check if it already has integration
        if grep -q "gameIntegration" "$game_file"; then
            echo "  - Already has integration, skipping"
        else
            # Add integration at the end of the file
            echo "$INTEGRATION_TEMPLATE" >> "$game_file"
            echo "  - Added game integration"
        fi
    else
        echo "  - File not found"
    fi
done

echo "Game integration script completed!"