document.addEventListener('DOMContentLoaded', async () => {
  const gamesGrid = document.getElementById('gamesGrid');
  const gameContainer = document.getElementById('gameContainer');
  const gameFrame = document.getElementById('gameFrame');
  const backToGames = document.getElementById('backToGames');
  const searchInput = document.getElementById('searchGames');
  const filters = document.querySelectorAll('.filters button');
  const template = document.getElementById('gameCardTemplate');
  let games = [];
  let filteredGames = [];

  // Hardcoded games manifest (to avoid CORS fetch issues with file://)
  const vanillaGames = [
    { name: "american-roulette", path: "games/vanilla/american_roulette/index.html", category: "casino", description: "Classic American Roulette game." },
    { name: "billiard", path: "games/vanilla/billiard/index.html", category: "arcade", description: "Play billiards." },
    { name: "car-race", path: "games/vanilla/car_race/index.html", category: "action", description: "Race cars on the track." },
    { name: "chess", path: "games/vanilla/chess1/index.html", category: "board", description: "Play chess against AI." },
    { name: "chess-nexus", path: "games/vanilla/chess-nexus/index.html", category: "board", description: "Advanced chess experience." },
    { name: "dominos", path: "games/vanilla/dominos/index.html", category: "board", description: "Dominoes game." },
    { name: "pubgy-kids", path: "games/vanilla/pubgy-kids/index.html", category: "action", description: "Kids version of battle royale." },
    { name: "river-raid", path: "games/vanilla/river-raid/index.html", category: "action", description: "Shoot down enemies in river raid." },
    { name: "snake", path: "games/vanilla/snake/index.html", category: "classic", description: "Classic snake game." },
    { name: "snake-ladder", path: "games/vanilla/snake&ladder1/index.html", category: "board", description: "Snakes and Ladders." },
    { name: "solitaire", path: "games/vanilla/solitaire/index.html", category: "classic", description: "Play solitaire cards." },
    { name: "spinner", path: "games/vanilla/spinner/index.html", category: "casino", description: "Spin the wheel." },
    { name: "tetris", path: "games/vanilla/tertis-classic/index.html", category: "classic", description: "Tetris block puzzle." },
    { name: "tic-tac-toe", path: "games/vanilla/tic-tac/index.html", category: "board", description: "Tic Tac Toe game." }
  ];
  games = [...vanillaGames];
  filteredGames = [...games];
  renderGames();

  // Render games
  function renderGames() {
    gamesGrid.innerHTML = '';
    filteredGames.forEach(game => {
      const clone = template.content.cloneNode(true);
      const card = clone.querySelector('.game-card');
      const img = clone.querySelector('img');
      const title = clone.querySelector('.game-title');
      const category = clone.querySelector('.game-category');
      const description = clone.querySelector('.game-description');
      const playBtn = clone.querySelector('.play-btn');

      img.src = game.thumbnail || ''; // No thumbnail for now, can add later
      title.textContent = game.name.replace(/-/g, ' ').toUpperCase();
      category.textContent = game.category;
      description.textContent = game.description;
      playBtn.onclick = () => loadGame(game.path);

      card.appendChild(playBtn);
      gamesGrid.appendChild(clone);
    });
  }

  // Load game in iframe
  function loadGame(path) {
    // For React, attempt fallback if client/index.html not working, but for now use direct path
    // Assume server serves static, for dev React may need vite -- but static serve client/index.html
    gameFrame.src = `/games-centre/${path}`;
    gameContainer.style.display = 'flex';
    gamesGrid.style.display = 'none';
    gameFrame.onload = () => {
      try {
        const doc = gameFrame.contentDocument || gameFrame.contentWindow.document;
        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/games-centre/games/vanilla/_shared/game-base.css';
        doc.head.appendChild(link);
      } catch (e) {}
    };
  }

  // Close game
  backToGames.onclick = () => {
    gameContainer.style.display = 'none';
    gameFrame.src = '';
    gamesGrid.style.display = 'grid';
  };

  // Search
  searchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase();
    filteredGames = games.filter(game => 
      game.name.toLowerCase().includes(query) || game.description.toLowerCase().includes(query)
    );
    renderGames();
  };

  // Filters
  filters.forEach(btn => {
    btn.onclick = () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const category = btn.dataset.category;
      if (category === 'all') {
        filteredGames = [...games];
      } else {
        filteredGames = games.filter(game => game.category === category);
      }
      renderGames();
    };
  });

  // Sound toggle (post message if embedded)
  const soundToggle = document.getElementById('ytSoundToggle');
  soundToggle.onclick = () => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'toggleSound' }, window.location.origin);
    }
    soundToggle.textContent = soundToggle.textContent === '🔊' ? '🔇' : '🔊';
  };
});
