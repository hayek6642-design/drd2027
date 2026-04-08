/**
 * Music Library Integration
 * Handles Jamendo API integration and local music library
 */

// Configuration object for Jamendo API
const JAMENDO_CONFIG = {
    clientId: 'YOUR_JAMENDO_CLIENT_ID', // Get from jamendo.com/admin/applications
    apiUrl: 'https://api.jamendo.com/v3.0',
    
    // Search parameters for instrumental tracks
    defaultParams: {
        format: 'json',
        limit: 20,
        include: 'musicinfo',
        audioformat: 'mp32', // 32kbps for preview, full quality for download
        orderby: 'popularity_total'
    },
    
    // Category mappings
    categoryTags: {
        quran: ['world', 'newage', 'ambient', 'meditation', 'calm'],
        singing: ['pop', 'rock', 'folk', 'dance', 'upbeat'],
        christian: ['gospel', 'classical', 'ambient', 'spiritual']
    }
};

// Local curated tracks for guaranteed availability
const LOCAL_KARAOKE_LIBRARY = [
    {
        id: 'local_001',
        title: 'تقاسيم عود - بياتي',
        artist: 'موسيقى عربية تقليدية',
        source: 'local',
        url: '/codebank/battalooda/assets/music/oud_bayati.mp3',
        duration: 120,
        category: ['quran', 'singing'],
        tags: ['عربي', 'تقليدي', 'هادئ'],
        license: 'Public Domain'
    },
    {
        id: 'local_002', 
        title: 'Karaoke Backing Track - Pop Ballad',
        artist: 'Royalty Free',
        source: 'local',
        url: '/codebank/battalooda/assets/music/pop_ballad_karaoke.mp3',
        duration: 180,
        category: ['singing'],
        tags: ['إنجليزي', 'بوب', 'عصري'],
        license: 'CC0'
    },
    {
        id: 'local_003',
        title: 'Ambient Meditation - Calm Instrumental',
        artist: 'Royalty Free Music',
        source: 'local',
        url: '/codebank/battalooda/assets/music/ambient_meditation.mp3',
        duration: 240,
        category: ['quran', 'christian'],
        tags: ['هادئ', 'تأمل', 'روحي'],
        license: 'CC0'
    },
    {
        id: 'local_004',
        title: 'Gospel Piano - Worship Instrumental',
        artist: 'Christian Music',
        source: 'local',
        url: '/codebank/battalooda/assets/music/gospel_piano.mp3',
        duration: 150,
        category: ['christian'],
        tags: ['مسيحي', 'كانتور', 'روحي'],
        license: 'CC0'
    },
    {
        id: 'local_005',
        title: 'Arabic Traditional - Takht Ensemble',
        artist: 'Traditional Music',
        source: 'local',
        url: '/codebank/battalooda/assets/music/takht_ensemble.mp3',
        duration: 180,
        category: ['quran', 'singing'],
        tags: ['عربي', 'تقليدي', 'كلاسيكي'],
        license: 'Public Domain'
    }
];

class JamendoLibrary {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async searchTracks(query, genre = null) {
        try {
            // Check cache first
            const cacheKey = `search_${query}_${genre}`;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            // Build query parameters
            const params = new URLSearchParams({
                ...JAMENDO_CONFIG.defaultParams,
                client_id: JAMENDO_CONFIG.clientId,
                search: query
            });

            if (genre) {
                params.append('tags', genre);
            }

            // Add instrumental filter
            params.append('vocalinstrumental', 'instrumental');

            const response = await fetch(`${JAMENDO_CONFIG.apiUrl}/tracks/?${params}`);
            
            if (!response.ok) {
                throw new Error(`Jamendo API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.headers.status === 'success' && data.results) {
                const tracks = this.formatJamendoResults(data.results);
                
                // Cache results
                this.cache.set(cacheKey, {
                    data: tracks,
                    timestamp: Date.now()
                });

                return tracks;
            } else {
                throw new Error('No results found');
            }

        } catch (error) {
            console.error('Error searching Jamendo:', error);
            // Fallback to local library
            return this.searchLocalTracks(query);
        }
    }

    async getPopularTracks(category) {
        try {
            // Check cache first
            const cacheKey = `popular_${category}`;
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            // Get category tags
            const tags = JAMENDO_CONFIG.categoryTags[category] || ['instrumental'];
            
            // Build query parameters for popular tracks
            const params = new URLSearchParams({
                ...JAMENDO_CONFIG.defaultParams,
                client_id: JAMENDO_CONFIG.clientId,
                tags: tags.join(','),
                vocalinstrumental: 'instrumental'
            });

            const response = await fetch(`${JAMENDO_CONFIG.apiUrl}/tracks/?${params}`);
            
            if (!response.ok) {
                throw new Error(`Jamendo API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.headers.status === 'success' && data.results) {
                const tracks = this.formatJamendoResults(data.results);
                
                // Cache results
                this.cache.set(cacheKey, {
                    data: tracks,
                    timestamp: Date.now()
                });

                return tracks;
            } else {
                throw new Error('No popular tracks found');
            }

        } catch (error) {
            console.error('Error getting popular tracks:', error);
            // Fallback to local library
            return this.getLocalTracksByCategory(category);
        }
    }

    formatJamendoResults(results) {
        return results.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artist_name,
            source: 'jamendo',
            url: track.audio,
            duration: Math.floor(track.duration || 0),
            category: this.categorizeTrack(track),
            tags: this.extractTags(track),
            license: track.license || 'Unknown',
            preview_url: track.audiodownload || track.audio,
            popularity: track.popularity_total || 0
        }));
    }

    categorizeTrack(track) {
        const tags = (track.tags || '').toLowerCase();
        const name = (track.name || '').toLowerCase();
        const artist = (track.artist_name || '').toLowerCase();

        // Check for Quran-related content
        if (tags.includes('quran') || tags.includes('islamic') || 
            name.includes('quran') || name.includes('islamic') ||
            artist.includes('quran') || artist.includes('islamic')) {
            return ['quran'];
        }

        // Check for Christian content
        if (tags.includes('gospel') || tags.includes('christian') || tags.includes('worship') ||
            name.includes('gospel') || name.includes('christian') || name.includes('worship') ||
            artist.includes('gospel') || artist.includes('christian') || artist.includes('worship')) {
            return ['christian'];
        }

        // Default to singing category for instrumental tracks
        return ['singing'];
    }

    extractTags(track) {
        const tags = [];
        
        if (track.tags) {
            tags.push(...track.tags.split(',').map(tag => tag.trim()));
        }

        // Add genre tags
        if (track.genre) {
            tags.push(track.genre);
        }

        // Add mood tags
        if (track.mood) {
            tags.push(track.mood);
        }

        return [...new Set(tags)]; // Remove duplicates
    }

    // Local library methods
    searchLocalTracks(query) {
        const lowerQuery = query.toLowerCase();
        
        return LOCAL_KARAOKE_LIBRARY.filter(track => 
            track.title.toLowerCase().includes(lowerQuery) ||
            track.artist.toLowerCase().includes(lowerQuery) ||
            track.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    getLocalTracksByCategory(category) {
        return LOCAL_KARAOKE_LIBRARY.filter(track => 
            track.category.includes(category)
        );
    }

    getAllLocalTracks() {
        return LOCAL_KARAOKE_LIBRARY;
    }

    // Favorites management
    async addToFavorites(track) {
        if (!window.battaloodaApp?.currentUser) {
            alert('يجب تسجيل الدخول لإضافة المفضلة');
            return false;
        }

        try {
            const response = await fetch('/api/battalooda/favorite-tracks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    trackId: track.id,
                    trackInfo: track
                })
            });

            if (response.ok) {
                alert('تمت إضافة الأغنية للمفضلة');
                return true;
            } else {
                throw new Error('Failed to add to favorites');
            }
        } catch (error) {
            console.error('Error adding to favorites:', error);
            alert('فشل إضافة الأغنية للمفضلة');
            return false;
        }
    }

    async getFavoriteTracks() {
        if (!window.battaloodaApp?.currentUser) {
            return [];
        }

        try {
            const response = await fetch('/api/battalooda/favorite-tracks');
            const data = await response.json();
            
            return data.tracks || [];
        } catch (error) {
            console.error('Error loading favorite tracks:', error);
            return [];
        }
    }

    // Preview functionality
    async playPreview(track) {
        if (!track.preview_url && !track.url) {
            alert('لا يوجد معاينة متاحة');
            return null;
        }

        const audioUrl = track.preview_url || track.url;
        const audio = new Audio(audioUrl);
        
        try {
            await audio.play();
            return {
                stop: () => {
                    audio.pause();
                    audio.currentTime = 0;
                },
                pause: () => audio.pause(),
                resume: () => audio.play()
            };
        } catch (error) {
            console.error('Error playing preview:', error);
            alert('فشل تشغيل المعاينة');
            return null;
        }
    }

    // Track validation
    validateTrack(track) {
        const errors = [];

        if (!track.title || track.title.trim().length === 0) {
            errors.push('عنوان الأغنية مطلوب');
        }

        if (!track.artist || track.artist.trim().length === 0) {
            errors.push('اسم الفنان مطلوب');
        }

        if (!track.url) {
            errors.push('رابط الأغنية مطلوب');
        }

        if (track.duration && track.duration < 30) {
            errors.push('مدة الأغنية يجب أن تكون أكثر من 30 ثانية');
        }

        if (track.duration && track.duration > 600) {
            errors.push('مدة الأغنية يجب أن تكون أقل من 10 دقائق');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Rate limiting
    async checkRateLimit() {
        const now = Date.now();
        const lastRequest = localStorage.getItem('jamendo_last_request');
        
        if (lastRequest) {
            const timeSinceLast = now - parseInt(lastRequest);
            const rateLimit = 1000; // 1 second between requests
            
            if (timeSinceLast < rateLimit) {
                await new Promise(resolve => setTimeout(resolve, rateLimit - timeSinceLast));
            }
        }
        
        localStorage.setItem('jamendo_last_request', now.toString());
    }
}

// Music library manager class
class MusicLibraryManager {
    constructor() {
        this.jamendoLibrary = new JamendoLibrary();
        this.currentSource = 'local'; // 'jamendo' or 'local' or 'favorites'
        this.currentCategory = 'singing';
        this.currentTracks = [];
    }

    async loadTracks(source, category = null, query = null) {
        this.currentSource = source;
        this.currentCategory = category || this.currentCategory;

        try {
            let tracks = [];

            switch (source) {
                case 'jamendo':
                    await this.jamendoLibrary.checkRateLimit();
                    if (query) {
                        tracks = await this.jamendoLibrary.searchTracks(query);
                    } else {
                        tracks = await this.jamendoLibrary.getPopularTracks(this.currentCategory);
                    }
                    break;

                case 'local':
                    if (query) {
                        tracks = this.jamendoLibrary.searchLocalTracks(query);
                    } else {
                        tracks = this.jamendoLibrary.getLocalTracksByCategory(this.currentCategory);
                    }
                    break;

                case 'favorites':
                    tracks = await this.jamendoLibrary.getFavoriteTracks();
                    break;

                default:
                    tracks = this.jamendoLibrary.getAllLocalTracks();
            }

            this.currentTracks = tracks;
            return tracks;

        } catch (error) {
            console.error('Error loading tracks:', error);
            return [];
        }
    }

    async searchTracks(query, source = null) {
        const currentSource = source || this.currentSource;
        return await this.loadTracks(currentSource, null, query);
    }

    async getPopularTracks(category) {
        return await this.loadTracks('jamendo', category);
    }

    async getLocalTracks(category) {
        return await this.loadTracks('local', category);
    }

    async getFavoriteTracks() {
        return await this.loadTracks('favorites');
    }

    async addToFavorites(track) {
        return await this.jamendoLibrary.addToFavorites(track);
    }

    async playPreview(track) {
        return await this.jamendoLibrary.playPreview(track);
    }

    validateTrack(track) {
        return this.jamendoLibrary.validateTrack(track);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JamendoLibrary, MusicLibraryManager, JAMENDO_CONFIG, LOCAL_KARAOKE_LIBRARY };
}