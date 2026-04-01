/**
 * Fair Play Validation System
 * 
 * Ensures game integrity and prevents cheating through:
 * - Game state validation
 * - Score verification
 * - Action timing checks
 * - Anti-cheat detection
 */

/**
 * Fair Play Validator
 */
class FairPlayValidator {
    constructor() {
        this.gameSessions = new Map();
        this.suspiciousActivities = [];
        this.bannedUsers = new Set();

        // Configurable thresholds
        this.config = {
            maxActionsPerSecond: 20,
            maxScoreIncreasePerSecond: 1000,
            minActionInterval: 50, // ms
            maxSessionDuration: 3600000, // 1 hour
            scoreDeviationThreshold: 3 // standard deviations
        };
    }

    /**
     * Initialize game session tracking
     */
    initSession(gameId, userId, betId) {
        const sessionId = `${gameId}_${userId}_${Date.now()}`;

        this.gameSessions.set(sessionId, {
            sessionId,
            gameId,
            userId,
            betId,
            startTime: Date.now(),
            actions: [],
            scores: [],
            validated: false,
            suspicious: false
        });

        return sessionId;
    }

    /**
     * Track game action
     */
    trackAction(sessionId, action) {
        const session = this.gameSessions.get(sessionId);
        if (!session) {
            console.warn('Session not found:', sessionId);
            return;
        }

        const timestamp = Date.now();
        session.actions.push({
            ...action,
            timestamp
        });

        // Check for suspicious activity
        this.detectAnomalies(sessionId);
    }

    /**
     * Track score update
     */
    trackScore(sessionId, score, timestamp = Date.now()) {
        const session = this.gameSessions.get(sessionId);
        if (!session) return;

        session.scores.push({ score, timestamp });
    }

    /**
     * Validate game state
     */
    validateGameState(sessionId, currentState, previousState) {
        const session = this.gameSessions.get(sessionId);
        if (!session) {
            return { valid: false, reason: 'Session not found' };
        }

        // Check state transition is logical
        if (!this.isValidStateTransition(previousState, currentState, session.gameId)) {
            this.flagSuspicious(sessionId, 'Invalid state transition');
            return { valid: false, reason: 'Invalid state transition' };
        }

        return { valid: true };
    }

    /**
     * Verify final score
     */
    async verifyScore(sessionId, reportedScore) {
        const session = this.gameSessions.get(sessionId);
        if (!session) {
            return { valid: false, reason: 'Session not found' };
        }

        // Check score progression
        const scoreProgression = session.scores.map(s => s.score);

        // Ensure score only increases (for most games)
        for (let i = 1; i < scoreProgression.length; i++) {
            if (scoreProgression[i] < scoreProgression[i - 1]) {
                this.flagSuspicious(sessionId, 'Score decreased');
                return { valid: false, reason: 'Invalid score progression' };
            }
        }

        // Check final score matches last tracked score
        const lastTrackedScore = scoreProgression[scoreProgression.length - 1];
        if (Math.abs(lastTrackedScore - reportedScore) > 10) {
            this.flagSuspicious(sessionId, 'Score mismatch');
            return { valid: false, reason: 'Reported score does not match tracked score' };
        }

        // Check score is realistic based on time played
        const duration = (Date.now() - session.startTime) / 1000; // seconds
        const scorePerSecond = reportedScore / duration;

        if (scorePerSecond > this.config.maxScoreIncreasePerSecond) {
            this.flagSuspicious(sessionId, 'Unrealistic score rate');
            return { valid: false, reason: 'Score increase rate is unrealistic' };
        }

        // Statistical check against historical data
        const isOutlier = await this.checkScoreOutlier(session.gameId, reportedScore, duration);
        if (isOutlier) {
            this.flagSuspicious(sessionId, 'Statistical outlier');
            return { valid: false, reason: 'Score is statistical outlier' };
        }

        session.validated = true;
        return { valid: true };
    }

    /**
     * Detect suspicious patterns
     */
    detectAnomalies(sessionId) {
        const session = this.gameSessions.get(sessionId);
        if (!session) return;

        const now = Date.now();
        const recentActions = session.actions.filter(a =>
            now - a.timestamp < 1000
        );

        // Too many actions per second
        if (recentActions.length > this.config.maxActionsPerSecond) {
            this.flagSuspicious(sessionId, 'Too many actions per second');
        }

        // Check action timing patterns (bot detection)
        if (session.actions.length > 10) {
            const intervals = [];
            for (let i = 1; i < session.actions.length; i++) {
                intervals.push(
                    session.actions[i].timestamp - session.actions[i - 1].timestamp
                );
            }

            // Check for suspiciously consistent intervals (bot pattern)
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) =>
                sum + Math.pow(interval - avgInterval, 2), 0
            ) / intervals.length;

            // Low variance suggests automated play
            if (variance < 10 && avgInterval < 200) {
                this.flagSuspicious(sessionId, 'Bot-like behavior detected');
            }
        }

        // Check for impossible actions
        if (recentActions.length > 0) {
            const lastAction = recentActions[recentActions.length - 1];
            if (lastAction.timestamp - (recentActions[0]?.timestamp || 0) < this.config.minActionInterval) {
                this.flagSuspicious(sessionId, 'Impossible action timing');
            }
        }
    }

    /**
     * Check if score is statistical outlier
     */
    async checkScoreOutlier(gameId, score, duration) {
        // Get historical scores for this game
        const historicalScores = this.getHistoricalScores(gameId);

        if (historicalScores.length < 10) {
            // Not enough data for statistical analysis
            return false;
        }

        // Calculate mean and standard deviation
        const mean = historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length;
        const variance = historicalScores.reduce((sum, s) =>
            sum + Math.pow(s - mean, 2), 0
        ) / historicalScores.length;
        const stdDev = Math.sqrt(variance);

        // Check if score is beyond threshold standard deviations
        const zScore = Math.abs((score - mean) / stdDev);
        return zScore > this.config.scoreDeviationThreshold;
    }

    /**
     * Validate action timing
     */
    validateTimings(sessionId) {
        const session = this.gameSessions.get(sessionId);
        if (!session) {
            return { valid: false };
        }

        const actions = session.actions;
        if (actions.length < 2) {
            return { valid: true };
        }

        // Check for timestamp manipulation
        for (let i = 1; i < actions.length; i++) {
            const timeDiff = actions[i].timestamp - actions[i - 1].timestamp;

            // Negative time difference suggests timestamp manipulation
            if (timeDiff < 0) {
                this.flagSuspicious(sessionId, 'Timestamp manipulation');
                return { valid: false, reason: 'Invalid timestamps detected' };
            }
        }

        return { valid: true };
    }

    /**
     * Check if state transition is valid for the game
     */
    isValidStateTransition(previousState, currentState, gameId) {
        // Game-specific validation logic would go here
        // For now, basic checks

        if (!previousState || !currentState) {
            return true; // Initial state
        }

        // Example: Snake game validation
        if (gameId === 'snake') {
            // Snake can only grow, not shrink (except on death/reset)
            if (currentState.length && previousState.length) {
                if (currentState.length < previousState.length - 1) {
                    return false; // Snake shrank too much
                }
            }
        }

        return true; // Default: allow transition
    }

    /**
     * Flag suspicious activity
     */
    flagSuspicious(sessionId, reason) {
        const session = this.gameSessions.get(sessionId);
        if (!session) return;

        session.suspicious = true;

        this.suspiciousActivities.push({
            sessionId,
            userId: session.userId,
            gameId: session.gameId,
            reason,
            timestamp: Date.now()
        });

        // Emit event for monitoring
        window.dispatchEvent(new CustomEvent('suspicious-activity', {
            detail: {
                sessionId,
                userId: session.userId,
                reason
            }
        }));

        console.warn(`[FairPlay] Suspicious activity: ${reason}`, session);
    }

    /**
     * Get session validation result
     */
    getSessionValidation(sessionId) {
        const session = this.gameSessions.get(sessionId);
        if (!session) {
            return { valid: false, reason: 'Session not found' };
        }

        return {
            valid: session.validated && !session.suspicious,
            suspicious: session.suspicious,
            validated: session.validated,
            sessionData: {
                duration: Date.now() - session.startTime,
                totalActions: session.actions.length,
                scoreUpdates: session.scores.length
            }
        };
    }

    /**
     * Get historical scores (mock - would connect to database)
     */
    getHistoricalScores(gameId) {
        // This would fetch from leaderboard/database
        // For now, return empty array
        return [];
    }

    /**
     * Ban user
     */
    banUser(userId, reason) {
        this.bannedUsers.add(userId);
        console.warn(`[FairPlay] User banned: ${userId} - ${reason}`);

        window.dispatchEvent(new CustomEvent('user-banned', {
            detail: { userId, reason }
        }));
    }

    /**
     * Check if user is banned
     */
    isUserBanned(userId) {
        return this.bannedUsers.has(userId);
    }

    /**
     * Clean up old sessions
     */
    cleanup() {
        const now = Date.now();
        const maxAge = 3600000; // 1 hour

        for (const [sessionId, session] of this.gameSessions.entries()) {
            if (now - session.startTime > maxAge) {
                this.gameSessions.delete(sessionId);
            }
        }
    }

    /**
     * Get suspicious activity report
     */
    getSuspiciousActivityReport(userId = null) {
        if (userId) {
            return this.suspiciousActivities.filter(a => a.userId === userId);
        }
        return this.suspiciousActivities;
    }




}

// Export singleton
export const fairPlay = new FairPlayValidator();

// Clean up old sessions every 5 minutes
setInterval(() => fairPlay.cleanup(), 300000);
        