/**
 * API Service for CodeBank Exchange
 * Handles all backend communication
 */

class ApiService {
    constructor() {
        this.baseURL = window.location.origin;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
        this.YOUTUBE_API_KEY = 'AIzaSyDO63K7yZFGswcgudXa8djPQEbAS8CZxgw';
        this.CHANNEL_ID = 'UCZ5heNyv3s5dIw9mtjsAGsg'; // Your YouTube channel ID
    }

    /**
     * Make authenticated API request
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @returns {Promise<Response>}
     */
    async request(method, endpoint, data = null) {
        const headers = { ...this.defaultHeaders };

        const config = {
            method,
            headers,
            credentials: 'include',
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {   
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            
            // Handle authentication errors
            if (response.status === 401) {
                localStorage.removeItem('user');
                window.location.href = 'login.html';
                throw new Error('Authentication required');
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ ok: false }));
                throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
            }
            
            return response;
        } catch (error) {
            if (window.__DEV__) console.warn(`API request failed: ${method} ${endpoint}`);
            // Add more specific error information
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network connection failed. Please check your internet connection.');
            }
            throw error;
        }
    }

    /**
     * Get monetization status
     * @returns {Promise<Object>}
     */
    async getStatus() {
        try {   
            // Fetch YouTube channel statistics
            const youtubeResponse = await fetch(
                `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${this.CHANNEL_ID}&key=${this.YOUTUBE_API_KEY}`
            );
            
            if (!youtubeResponse.ok) {
                throw new Error('YouTube API request failed');
            }
            
            const youtubeData = await youtubeResponse.json();
            const subscriberCount = parseInt(youtubeData.items[0]?.statistics?.subscriberCount || '0');
            
            // Calculate monetization status
            const isMonetized = subscriberCount >= 1000;
            const progressPercentage = Math.min((subscriberCount / 1000) * 100, 100);
            const remainingSubscribers = Math.max(1000 - subscriberCount, 0);
            
            return {
                subscribers: subscriberCount,
                isMonetized: isMonetized,
                progressPercentage: progressPercentage,
                remainingSubscribers: remainingSubscribers,
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching YouTube status:', error);
            // Return fallback data
            return {
                subscribers: 0,
                isMonetized: false,
                progressPercentage: 0,
                remainingSubscribers: 1000,
                lastChecked: new Date().toISOString()
            };
        }
    }

    /**
     * Get user assets
     * @returns {Promise<Object>}
     */
    async getUserAssets() {
        try {   
            const userId = window.APP_USER_ID
            if (!userId) throw new Error('Auth required')
            const response = await this.request('GET', `/api/user-assets?userId=${encodeURIComponent(userId)}`);
            const data = await response.json();
            
            return {
                assets: {
                    codes: data.codes || 0,
                    silverBars: data.silver_bars || 0,
                    goldBars: data.gold_bars || 0,
                    savedCodes: data.saved_codes || []
                }
            };
        } catch (error) {
            console.error('Error fetching user assets:', error);
            throw error
        }
    }

    /**
     * Get currency exchange rates
     * @returns {Promise<Object>}
     */
    async getCurrencyRates() {
        try {   
            const response = await this.request('GET', '/api/currency-rates');
            const data = await response.json();
            
            return {
                rates: {
                    USD: data.USD || '0.032100',
                    EUR: data.EUR || '0.029800',
                    GBP: data.GBP || '0.025300',
                    SAR: data.SAR || '0.120500',
                    AED: data.AED || '0.117900'
                }
            };
        } catch (error) {
            console.error('Error fetching currency rates:', error);
            // Return fallback rates
            return {
                rates: {
                    USD: '0.032100',
                    EUR: '0.029800',
                    GBP: '0.025300',
                    SAR: '0.120500',
                    AED: '0.117900'
                }
            };
        }
    }

    /**
     * Get transaction history
     * @returns {Promise<Object>}
     */
    async getTransactions() {
        try {   
            const response = await this.request('GET', '/api/transactions');
            const data = await response.json();
            
            return {
                transactions: data.transactions || []
            };
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return {
                transactions: []
            };
        }
    }

    /**
     * Get game statistics
     * @returns {Promise<Object>}
     */
    async getGameStats() {
        try {   
            const response = await this.request('GET', '/api/game-stats');
            const data = await response.json();
            
            return {
                stats: {
                    totalGames: data.total_games || 0,
                    totalWon: data.total_won || 0,
                    winRate: data.win_rate || '0%',
                    biggestWin: data.biggest_win || 0
                }
            };
        } catch (error) {
            console.error('Error fetching game stats:', error);
            return {
                stats: {
                    totalGames: 0,
                    totalWon: 0,
                    winRate: '0%',
                    biggestWin: 0
                }
            };
        }
    }

    /**
     * Buy codes
     * @param {Object} data - Purchase data
     * @returns {Promise<Object>}
     */
    async buyCodes(data) {
        const response = await this.request('POST', '/api/buy-codes', data);
        return response.json();
    }

    /**
     * Sell codes
     * @param {Object} data - Sale data
     * @returns {Promise<Object>}
     */
    async sellCodes(data) {
        const response = await this.request('POST', '/api/sell-codes', data);
        return response.json();
    }

    /**
     * Play games
     * @param {Object} data - Game data
     * @returns {Promise<Object>}
     */
    async playGames(data) {
        const response = await this.request('POST', '/api/play-games', {
            game_type: data.gameType,
            games_to_play: data.gamesToPlay,
            codes_per_game: data.codesPerGame
        });
        return response.json();
    }

    /**
     * Compress codes
     * @param {Object} data - Compression data
     * @returns {Promise<Object>}
     */
    async compressCodes(data) {
        const response = await this.request('POST', '/api/compress-codes', {
            amount: data.amount,
            mode: data.mode
        });
        return response.json();
    }

    /**
     * Grind for codes
     * @param {string} endpoint - Grind endpoint
     * @returns {Promise<Object>}
     */
    async grind(endpoint) {
        const response = await this.request('POST', endpoint);
        return response.json();
    }
}

// Create global API instance
const api = new ApiService();
