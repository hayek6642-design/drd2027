/**
 * Competition State Authority (CSA)
 * 
 * SINGLE SOURCE OF TRUTH for all competition state.
 * Handles persistence, recovery, and strict state transitions.
 * 
 * MANDATORY:
 * - All state changes must go through this module
 * - Persistence via IndexedDB (primary) and localStorage (fallback)
 * - Strict enforcement of state machine
 */

const DB_NAME = 'GamesCentreCSA';
const DB_VERSION = 1;
const STORE_NAME = 'competitions';

const STATUS = {
    CREATED: 'CREATED',
    LOCKING: 'LOCKING',
    LOCKED: 'LOCKED',
    RUNNING: 'RUNNING',
    SETTLING: 'SETTLING',
    SETTLED: 'SETTLED',
    CANCELLED: 'CANCELLED'
};

const TRANSITIONS = {
    [STATUS.CREATED]: [STATUS.LOCKING, STATUS.CANCELLED],
    [STATUS.LOCKING]: [STATUS.LOCKED, STATUS.CANCELLED],
    [STATUS.LOCKED]: [STATUS.RUNNING],
    [STATUS.RUNNING]: [STATUS.SETTLING],
    [STATUS.SETTLING]: [STATUS.SETTLED],
    [STATUS.SETTLED]: [],
    [STATUS.CANCELLED]: []
};

class CompetitionStateAuthority {
    constructor() {
        this.db = null;
        this.initPromise = this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error("[CSA] Failed to open IndexedDB. Falling back to in-memory/localStorage.");
                // Fallback implementation logic could go here, for now we log error
                resolve(null);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("[CSA] IndexedDB initialized.");
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'competitionId' });
                    store.createIndex('status', 'status', { unique: false });
                    store.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
            };
        });
    }

    // --- Core API ---

    /**
     * Create a new competition state
     */
    async create(competitionData) {
        await this.initPromise;

        // Strict Schema Validation
        if (!competitionData.competitionId || !competitionData.gameId || !competitionData.mode) {
            throw new Error("[CSA] Invalid competition data structure");
        }

        const state = {
            competitionId: competitionData.competitionId,
            gameId: competitionData.gameId,
            mode: competitionData.mode,
            asset: competitionData.asset || 'code', // Default to 'code'
            status: STATUS.CREATED, // Initial status
            players: competitionData.players || [], // { userId, serviceFee, lockId, joinedAt }
            reward: competitionData.reward || { source: "SYSTEM_POOL", amount: 0 },
            createdAt: Date.now(),
            updatedAt: Date.now(),
            recoveryToken: crypto.randomUUID(),
            settlementId: null
        };

        await this.persist(state);
        return state;
    }

    /**
     * Get competition state by ID
     */
    async get(competitionId) {
        await this.initPromise;
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve(this.loadFromLocalStorage(competitionId));

            const tx = this.db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(competitionId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => resolve(null);
        });
    }

    /**
     * Update competition state with strict transition rules
     */
    async transition(competitionId, nextStatus, updates = {}) {
        const state = await this.get(competitionId);
        if (!state) throw new Error(`[CSA] Competition not found: ${competitionId}`);

        // State Machine Validation
        if (!this.isValidTransition(state.status, nextStatus)) {
            throw new Error(`[CSA] Invalid transition: ${state.status} -> ${nextStatus}`);
        }

        // Apply updates
        const newState = {
            ...state,
            ...updates,
            status: nextStatus,
            updatedAt: Date.now()
        };

        await this.persist(newState);
        return newState;
    }

    /**
     * Update State without transition (e.g. adding players while in CREATED)
     */
    async update(competitionId, updates) {
        const state = await this.get(competitionId);
        if (!state) throw new Error(`[CSA] Competition not found: ${competitionId}`);

        const newState = {
            ...state,
            ...updates,
            updatedAt: Date.now()
        };

        await this.persist(newState);
        return newState;
    }

    /**
     * Update player lock information
     */
    async updatePlayerLock(competitionId, userId, lockId) {
        const state = await this.get(competitionId);
        if (!state) throw new Error(`[CSA] Competition not found: ${competitionId}`);

        const playerIndex = state.players.findIndex(p => p.userId === userId);
        if (playerIndex === -1) throw new Error(`[CSA] Player not found: ${userId}`);

        state.players[playerIndex].lockId = lockId;
        state.updatedAt = Date.now();

        await this.persist(state);
        return state;
    }

    // --- Helpers ---

    isValidTransition(current, next) {
        const allowed = TRANSITIONS[current];
        return allowed && allowed.includes(next);
    }

    async persist(state) {
        // save to IndexedDB
        if (this.db) {
            const tx = this.db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(state);
        }

        // save to localStorage as backup (limited size, mostly for critical recovery)
        this.saveToLocalStorage(state);
    }

    saveToLocalStorage(state) {
        try {
            const key = `csa_${state.competitionId}`;
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.warn("[CSA] localStorage full or failed", e);
        }
    }

    loadFromLocalStorage(competitionId) {
        try {
            const key = `csa_${competitionId}`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Recovery: Get all active competitions
     */
    async getActiveCompetitions() {
        await this.initPromise;
        const activeStatuses = [STATUS.CREATED, STATUS.LOCKING, STATUS.LOCKED, STATUS.RUNNING, STATUS.SETTLING];

        if (!this.db) {
            // fallback scan localStorage?
            return [];
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const index = store.index('status');
            const request = index.getAll(); // Get all might be heavy, but strictly we filter below

            request.onsuccess = () => {
                const all = request.result || [];
                // Filter only active ones
                const active = all.filter(c => activeStatuses.includes(c.status));
                resolve(active);
            };
        });
    }
}

export const csa = new CompetitionStateAuthority();
export const COMPETITION_STATUS = STATUS;
