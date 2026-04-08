const gamesManifest = [
  { id: 'american_roulette', name: 'American Roulette', category: 'casino', description: 'Classic casino roulette game.', image: '/services/codebank/Games-Centre/assets/images/roulette.jpg', url: '/services/codebank/Games-Centre/games/american_roulette/index.html' },
  { id: 'billiard', name: 'Billiard', category: 'arcade', description: 'Play pool with friends.', image: '/services/codebank/Games-Centre/assets/images/billiard.jpg', url: '/services/codebank/Games-Centre/games/billiard/index.html' },
  { id: 'car_race', name: 'Car Race', category: 'action', description: 'Race cars on tracks.', image: '/services/codebank/Games-Centre/assets/images/car_race.jpg', url: '/services/codebank/Games-Centre/games/car_race/index.html' },
  { id: 'chess-nexus', name: 'Chess Nexus', category: 'board', description: 'Advanced chess game.', image: '/services/codebank/Games-Centre/assets/images/chess.jpg', url: '/services/codebank/Games-Centre/games/chess-nexus/index.html' },
  { id: 'pubgy-kids', name: 'PUBGY Kids', category: 'action', description: 'Kid-friendly battle royale.', image: '/services/codebank/Games-Centre/assets/images/pubg.jpg', url: '/services/codebank/Games-Centre/games/pubgy-kids/index.html' },
  { id: 'river-raid', name: 'River Raid', category: 'classic', description: 'Classic shooting game.', image: '/services/codebank/Games-Centre/assets/images/river_raid.jpg', url: '/services/codebank/Games-Centre/games/river-raid/index.html' },
  { id: 'snake-ladder', name: 'Snake & Ladder', category: 'board', description: 'Traditional board game.', image: '/services/codebank/Games-Centre/assets/images/snake_ladder.jpg', url: '/services/codebank/Games-Centre/games/snake&ladder1/index.html' },
  { id: 'solitaire', name: 'Solitaire', category: 'card', description: 'Classic card solitaire.', image: '/services/codebank/Games-Centre/assets/images/solitaire.jpg', url: '/services/codebank/Games-Centre/games/solitaire/index.html' },
  { id: 'tic-tac-toe', name: 'Tic Tac Toe', category: 'board', description: 'Simple strategy game.', image: '/services/codebank/Games-Centre/assets/images/tic_tac.jpg', url: '/services/codebank/Games-Centre/games/tic-tac/index.html' },
  { id: 'tetris', name: 'Tetris Classic', category: 'puzzle', description: 'Block falling puzzle.', image: '/services/codebank/Games-Centre/assets/images/tetris.jpg', url: '/services/codebank/Games-Centre/games/tertis-classic/index.html' },
  // Add more games as directories are discovered
];

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchGames');
  const filterBtns = document.querySelectorAll('.filters button');
  const gamesGrid = document.getElementById('gamesGrid');
  const gameContainer = document.getElementById('gameContainer');
  const gameFrame = document.getElementById('gameFrame');
  const backToGames = document.getElementById('backToGames');
  const ytSoundToggle = document.getElementById('ytSoundToggle');

  let currentFilter = 'all';
  let searchTerm = '';

  function renderGames(games) {
    gamesGrid.innerHTML = '';
    games.forEach(game => {
      const template = document.getElementById('gameCardTemplate').content.cloneNode(true);
      const img = template.querySelector('img');
      img.src = game.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdBTUUgSU1BR0U8L3RleHQ+PC9zdmc+';
      img.alt = game.name;
      template.querySelector('.game-title').textContent = game.name;
      template.querySelector('.game-category').textContent = game.category.toUpperCase();
      template.querySelector('.game-description').textContent = game.description;
      const playBtn = template.querySelector('.play-btn');
      playBtn.textContent = 'Play Game';
      playBtn.addEventListener('click', () => {
        gameFrame.src = game.url;
        gameContainer.style.display = 'flex';
      });
      gamesGrid.appendChild(template);
    });
  }

  function filterGames() {
    let filtered = gamesManifest.filter(game => 
      game.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (currentFilter === 'all' || game.category === currentFilter)
    );
    renderGames(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value;
      filterGames();
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.category;
      filterGames();
    });
  });

  if (backToGames) {
    backToGames.addEventListener('click', () => {
      gameContainer.style.display = 'none';
      gameFrame.src = '';
    });
  }

  if (ytSoundToggle) {
    ytSoundToggle.addEventListener('click', () => {
      // Notify parent window about sound toggle
      if (window.parent) {
        window.parent.postMessage({ type: 'soundToggle', enabled: ytSoundToggle.textContent === '🔊' }, window.location.origin);
      }
      ytSoundToggle.textContent = ytSoundToggle.textContent === '🔊' ? '🔇' : '🔊';
    });
  }

  // Initial render
  filterGames();
});
