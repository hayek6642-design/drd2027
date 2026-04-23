/**
 * Quran Browser - CodeBank Service
 * Interactive Quranic text and translation viewer
 */

class QuranBrowser {
    constructor() {
        this.currentSurah = null;
        this.surahs = this.initializeSurahs();
        this.language = 'ar';
        this.translation = 'saheeh';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderSurahsList();
    }

    setupEventListeners() {
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterSurahs(e.target.value));
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.language = e.target.value;
            if (this.currentSurah) this.displaySurah(this.currentSurah);
        });
        document.getElementById('translationSelect').addEventListener('change', (e) => {
            this.translation = e.target.value;
            if (this.currentSurah) this.displaySurah(this.currentSurah);
        });
        document.querySelector('.search-btn').addEventListener('click', () => this.search());
        document.getElementById('audioBtn').addEventListener('click', () => this.playAudio());
    }

    initializeSurahs() {
        return [
            { number: 1, name: 'Al-Fatiha', verses: 7, translation: 'The Opening' },
            { number: 2, name: 'Al-Baqarah', verses: 286, translation: 'The Cow' },
            { number: 3, name: 'Al-Imran', verses: 200, translation: 'The Family of Imran' },
            { number: 4, name: 'An-Nisa', verses: 176, translation: 'The Women' },
            { number: 5, name: 'Al-Ma\'idah', verses: 120, translation: 'The Table' },
            { number: 6, name: 'Al-An\'am', verses: 165, translation: 'The Cattle' },
            { number: 7, name: 'Al-A\'raf', verses: 206, translation: 'The Heights' },
            { number: 8, name: 'Al-Anfal', verses: 75, translation: 'The Spoils of War' },
            { number: 9, name: 'At-Tawbah', verses: 129, translation: 'The Repentance' },
            { number: 10, name: 'Yunus', verses: 109, translation: 'Jonah' },
            { number: 11, name: 'Hud', verses: 123, translation: 'Hud' },
            { number: 12, name: 'Yusuf', verses: 111, translation: 'Joseph' },
            { number: 13, name: 'Ar-Ra\'d', verses: 43, translation: 'The Thunder' },
            { number: 14, name: 'Ibrahim', verses: 52, translation: 'Abraham' },
            { number: 15, name: 'Al-Hijr', verses: 99, translation: 'The Rocky Tract' }
        ];
    }

    renderSurahsList() {
        const list = document.getElementById('surahsList');
        list.innerHTML = this.surahs.map(surah => `
            <div class="surah-item" data-number="${surah.number}">
                <div class="surah-number">${surah.number}</div>
                <div class="surah-content">
                    <h3>${surah.name}</h3>
                    <p class="surah-translation">${surah.translation}</p>
                    <span class="verse-count-badge">${surah.verses} verses</span>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.surah-item').forEach(item => {
            item.addEventListener('click', () => this.displaySurah(parseInt(item.dataset.number)));
        });
    }

    filterSurahs(query) {
        const filtered = this.surahs.filter(s =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.translation.toLowerCase().includes(query.toLowerCase())
        );

        const list = document.getElementById('surahsList');
        if (filtered.length === 0) {
            list.innerHTML = '<div class="no-results">No surahs found</div>';
        } else {
            list.innerHTML = filtered.map(surah => `
                <div class="surah-item" data-number="${surah.number}">
                    <div class="surah-number">${surah.number}</div>
                    <div class="surah-content">
                        <h3>${surah.name}</h3>
                        <p class="surah-translation">${surah.translation}</p>
                        <span class="verse-count-badge">${surah.verses} verses</span>
                    </div>
                </div>
            `).join('');

            document.querySelectorAll('.surah-item').forEach(item => {
                item.addEventListener('click', () => this.displaySurah(parseInt(item.dataset.number)));
            });
        }
    }

    displaySurah(surahNumber) {
        const surah = this.surahs.find(s => s.number === surahNumber);
        if (!surah) return;

        this.currentSurah = surahNumber;

        // Update header
        document.getElementById('surahTitle').textContent = `${surah.number}. ${surah.name}`;
        document.getElementById('verseCount').textContent = `${surah.verses} verses`;

        // Mark active surah
        document.querySelectorAll('.surah-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-number="${surahNumber}"]`).classList.add('active');

        // Render verses
        this.renderVerses(surah);
    }

    renderVerses(surah) {
        const container = document.getElementById('versesContainer');
        
        let html = '';
        for (let i = 1; i <= Math.min(surah.verses, 10); i++) {
            const arabicText = `بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم`;
            const translation = `Praise be to Allah, Lord of the Worlds, The Most Gracious, The Most Merciful`;
            
            html += `
                <div class="verse-item">
                    <div class="verse-header">
                        <span class="verse-number">${surah.number}:${i}</span>
                        <button class="copy-btn" title="Copy verse">📋</button>
                    </div>
                    <div class="verse-text arabic">${arabicText}</div>
                    <div class="verse-translation">${translation}</div>
                </div>
            `;
        }

        container.innerHTML = html;

        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.copyVerse(e));
        });
    }

    copyVerse(event) {
        const verseItem = event.target.closest('.verse-item');
        const arabicText = verseItem.querySelector('.verse-text').textContent;
        const verseNum = verseItem.querySelector('.verse-number').textContent;

        navigator.clipboard.writeText(`${verseNum}\n${arabicText}`).then(() => {
            const btn = event.target;
            btn.textContent = '✓ Copied';
            setTimeout(() => btn.textContent = '📋', 2000);
        });
    }

    search() {
        const query = document.getElementById('searchInput').value;
        if (query) {
            this.filterSurahs(query);
        }
    }

    playAudio() {
        const surahNumber = this.currentSurah;
        if (!surahNumber) return;

        alert(`Playing Quranic recitation for Surah ${surahNumber}...\n\nAudio functionality would be implemented with a Quran audio API.`);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.quranBrowser = new QuranBrowser();
    console.log('[Quran Browser] Initialized successfully');
});
