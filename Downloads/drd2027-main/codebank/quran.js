/**
 * Quran Service - Quranic reading with bookmarks
 */

class QuranService {
  constructor() {
    this.currentSurah = 1;
    this.bookmarks = [];
    this.surahs = [];
    this.verses = [];
    this.init();
  }

  async init() {
    if (!AuthClient?.isAuth?.()) {
      window.location.href = '/login.html';
      return;
    }

    await this.loadSurahs();
    this.setupEventListeners();
    await this.loadBookmarks();
    this.displaySurahs();
  }

  setupEventListeners() {
    document.getElementById('quranSearch')?.addEventListener('input', (e) => this.searchQuran(e.target.value));
    document.getElementById('bookmarksBtn')?.addEventListener('click', () => this.toggleBookmarksView());
    document.querySelectorAll('.surah-item').forEach(item => {
      item.addEventListener('click', () => this.loadSurah(parseInt(item.dataset.surah)));
    });
  }

  async loadSurahs() {
    try {
      const response = await fetch('/api/quran/surahs');
      if (response.ok) {
        this.surahs = await response.json();
      } else {
        this.surahs = this.getDefaultSurahs();
      }
    } catch (error) {
      console.error('Error loading surahs:', error);
      this.surahs = this.getDefaultSurahs();
    }
  }

  getDefaultSurahs() {
    return [
      { number: 1, name: 'Al-Fatihah', verses: 7, meaning: 'The Opening' },
      { number: 2, name: 'Al-Baqarah', verses: 286, meaning: 'The Cow' },
      { number: 3, name: 'Ali Imran', verses: 200, meaning: 'The Family of Imran' },
      { number: 4, name: 'An-Nisa', verses: 176, meaning: 'The Women' },
      { number: 5, name: 'Al-Ma\'idah', verses: 120, meaning: 'The Table Spread' },
      // Add more surahs as needed
    ];
  }

  displaySurahs() {
    const container = document.getElementById('surahContainer');
    if (!container) return;

    container.innerHTML = this.surahs.map(surah => `
      <div class="surah-item" data-surah="${surah.number}">
        <div class="surah-number">${surah.number}</div>
        <div class="surah-info">
          <div class="surah-name">${surah.name}</div>
          <div class="surah-meaning">${surah.meaning}</div>
          <div class="surah-verses">${surah.verses} verses</div>
        </div>
        <div class="bookmark-icon" data-surah="${surah.number}">
          ${this.isSurahBookmarked(surah.number) ? '🔖' : '☐'}
        </div>
      </div>
    `).join('');

    this.setupEventListeners();
    this.loadSurah(this.currentSurah);
  }

  async loadSurah(surahNumber) {
    this.currentSurah = surahNumber;
    const surah = this.surahs.find(s => s.number === surahNumber);

    if (!surah) return;

    document.getElementById('surahTitle').textContent = `${surah.number}. ${surah.name}`;
    document.getElementById('surahDescription').textContent = surah.meaning;

    try {
      const response = await fetch(`/api/quran/surah/${surahNumber}`);
      if (response.ok) {
        this.verses = await response.json();
      } else {
        this.verses = this.getDefaultVerses(surahNumber);
      }
    } catch (error) {
      console.error('Error loading surah:', error);
      this.verses = this.getDefaultVerses(surahNumber);
    }

    this.displayVerses();
  }

  getDefaultVerses(surahNumber) {
    // Return sample verse structure
    return [
      { surah: surahNumber, verse: 1, arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', english: 'In the name of Allah, the Most Gracious, the Most Merciful' }
    ];
  }

  displayVerses() {
    const container = document.getElementById('versesContainer');
    if (!container) return;

    container.innerHTML = this.verses.map(v => `
      <div class="verse" data-verse="${v.verse}">
        <div class="verse-header">
          <span class="verse-number">${v.surah}:${v.verse}</span>
          <div class="verse-actions">
            <button class="verse-btn bookmark-btn" data-verse="${v.verse}" title="Bookmark">
              ${this.isVerseBookmarked(this.currentSurah, v.verse) ? '🔖' : '☐'}
            </button>
            <button class="verse-btn share-btn" data-verse="${v.verse}" title="Share">📤</button>
            <button class="verse-btn copy-btn" data-verse="${v.verse}" title="Copy">📋</button>
          </div>
        </div>
        <div class="verse-arabic">${v.arabic}</div>
        <div class="verse-translation">${v.english}</div>
      </div>
    `).join('');

    document.querySelectorAll('.bookmark-btn').forEach(btn => {
      btn.addEventListener('click', () => this.toggleBookmark(this.currentSurah, parseInt(btn.dataset.verse)));
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const verse = this.verses.find(v => v.verse === parseInt(btn.dataset.verse));
        navigator.clipboard.writeText(`${verse.arabic}\n${verse.english}`);
        this.showNotification('Verse copied to clipboard');
      });
    });

    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const verse = this.verses.find(v => v.verse === parseInt(btn.dataset.verse));
        const text = `Quran ${this.currentSurah}:${verse.verse}\n${verse.arabic}\n${verse.english}`;
        if (navigator.share) {
          navigator.share({ title: 'Quran Verse', text });
        }
      });
    });
  }

  async toggleBookmark(surah, verse) {
    const index = this.bookmarks.findIndex(b => b.surah === surah && b.verse === verse);

    if (index > -1) {
      this.bookmarks.splice(index, 1);
    } else {
      this.bookmarks.push({ surah, verse, timestamp: Date.now() });
    }

    await this.saveBookmarks();
    this.displayVerses();
    this.updateBookmarkIcon();
  }

  isSurahBookmarked(surah) {
    return this.bookmarks.some(b => b.surah === surah);
  }

  isVerseBookmarked(surah, verse) {
    return this.bookmarks.some(b => b.surah === surah && b.verse === verse);
  }

  updateBookmarkIcon() {
    document.querySelectorAll('.bookmark-icon').forEach(icon => {
      const surah = parseInt(icon.dataset.surah);
      icon.textContent = this.isSurahBookmarked(surah) ? '🔖' : '☐';
    });
  }

  async loadBookmarks() {
    try {
      const response = await fetch('/api/quran/bookmarks', { credentials: 'include' });
      if (response.ok) {
        this.bookmarks = await response.json();
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  }

  async saveBookmarks() {
    try {
      await fetch('/api/quran/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.bookmarks),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  }

  toggleBookmarksView() {
    document.getElementById('surahView').classList.toggle('active');
    document.getElementById('bookmarksView').classList.toggle('active');

    if (document.getElementById('bookmarksView').classList.contains('active')) {
      this.displayBookmarks();
    }
  }

  displayBookmarks() {
    const container = document.getElementById('bookmarksList');
    if (!container) return;

    if (this.bookmarks.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:#999;">No bookmarks yet</p>';
      return;
    }

    container.innerHTML = this.bookmarks.map(bm => {
      const surah = this.surahs.find(s => s.number === bm.surah);
      return `
        <div class="bookmark-item">
          <div>
            <strong>${surah?.name || 'Surah'} ${bm.surah}:${bm.verse}</strong>
            <p style="margin:5px 0;color:#999;font-size:12px;">${new Date(bm.timestamp).toLocaleDateString()}</p>
          </div>
          <button onclick="quranService.toggleBookmark(${bm.surah}, ${bm.verse})">🗑️</button>
        </div>
      `;
    }).join('');
  }

  searchQuran(query) {
    if (!query) {
      document.getElementById('surahView').classList.add('active');
      document.getElementById('bookmarksView').classList.remove('active');
      document.getElementById('searchResultsView').classList.remove('active');
      return;
    }

    const results = this.surahs.filter(s =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.meaning.toLowerCase().includes(query.toLowerCase())
    );

    document.getElementById('surahView').classList.remove('active');
    document.getElementById('searchResultsView').classList.add('active');

    const container = document.getElementById('searchResults');
    container.innerHTML = results.map(surah => `
      <div class="search-result" onclick="quranService.loadSurah(${surah.number})">
        <strong>${surah.number}. ${surah.name}</strong> - ${surah.meaning}
      </div>
    `).join('');
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #4caf50;
      color: white;
      border-radius: 4px;
      z-index: 10000;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }
}

const quranService = new QuranService();
