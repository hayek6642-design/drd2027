#!/bin/bash
# Batch Game Integration Script
# This script adds the Games Centre integration to all vanilla games

GAMES_DIR="$(cd "$(dirname "$0")/../games/vanilla" && pwd)"
SHARED_DIR="$GAMES_DIR/_shared"

echo "🎮 Games Centre - Batch Integration Script"
echo "==========================================="
echo ""

# Games to integrate (excluding snake which is already done)
GAMES=(
    "american_roulette"
    "billiard"
    "car_race"
    "chess1"
    "chess-nexus"
    "dominos"
    "pubgy-kids"
    "river-raid"
    "snake&ladder1"
    "solitaire"
    "spinner"
    "tertis-classic"
    "tic-tac"
)

integrate_game() {
    local game_dir="$1"
    local game_name=$(basename "$game_dir")
    
    echo "📦 Integrating: $game_name"
    
    # Find the main HTML file
    local html_file=""
    if [ -f "$game_dir/index.html" ]; then
        html_file="$game_dir/index.html"
    else
        html_file=$(find "$game_dir" -name "*.html" -type f | head -n 1)
    fi
    
    if [ -z "$html_file" ]; then
        echo "   ⚠️  No HTML file found, skipping..."
        return
    fi
    
    # Check if already integrated
    if grep -q "game-integration.js" "$html_file"; then
        echo "   ✓  Already integrated"
        return
    fi
    
    # Add integration script before closing body tag
    if grep -q "</body>" "$html_file"; then
        # Create backup
        cp "$html_file" "$html_file.bak"
        
        #Add integration
        sed -i '' 's|</body>|    <script type="module" src="../_shared/game-integration.js"></script>\n</body>|' "$html_file"
        
        # Add common styles to head if not present
        if ! grep -q "common-styles.css" "$html_file"; then
            sed -i '' 's|</head>|    <link rel="stylesheet" href="../_shared/common-styles.css">\n</head>|' "$html_file"
        fi
        
        echo "   ✅ Integration complete"
    else
        echo "   ⚠️  No </body> tag found, manual integration needed"
    fi
}

# Main execution
echo "Found ${#GAMES[@]} games to process"
echo ""

for game in "${GAMES[@]}"; do
    game_path="$GAMES_DIR/$game"
    if [ -d "$game_path" ]; then
        integrate_game "$game_path"
    else
        echo "⚠️  Directory not found: $game"
    fi
    echo ""
done

echo "==========================================="
echo "✨ Integration complete!"
echo ""
echo "Next steps:"
echo "1. Test each game in the dashboard"
echo "2. Add score reporting to game logic"
echo "3. Style adjustments as needed"
