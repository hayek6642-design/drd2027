/**
 * CRITICAL FAILURE TESTS - Games Centre
 * 
 * These tests MUST pass before production deployment.
 * Tests verify system resilience against catastrophic failures.
 */

import { bettingCore, competitionCore, COMPETITION_MODES } from '../core/js/betting-core.js';
import { assetsBus } from '../core/js/assets-bus-adapter.js';
import { lobbyManager } from '../core/js/lobby-manager.js';
import { fairPlay } from '../core/js/fair-play.js';
import { collusionEngine } from '../core/js/collusion-engine.js';

/**
 * Test Suite: Catastrophic Failure Scenarios
 */
class CatastrophicFailureTests {
    constructor() {
        this.results = [];
        this.failed = [];
    }

    /**
     * TEST 1: Disconnect During Lock
     * 
     * Scenario:
     * 1. User initiates bet
     * 2. Assets Bus locks balance
     * 3. Connection drops before Ledger records
     * 4. User reconnects
     * 5. Retry lock operation
     * 
     * Expected:
     * - No double lock
     * - Balance locked only once
     * - Idempotent operation
     */
    async testDisconnectDuringLock() {
        console.log('🧪 TEST 1: Disconnect During Lock');

        const userId = 'test_user_1';
        const betAmount = 100;

        try {
            // Get initial balance
            const initialBalance = await assetsBus.getBalance(userId, 'code');

            // First lock attempt (simulating interrupted operation)
            const lock1 = await assetsBus.lockBalance(userId, 'code', betAmount, {
                reason: 'bet_lock_attempt_1',
                timestamp: Date.now()
            });

            // Simulate reconnect and retry with SAME metadata
            const lock2 = await assetsBus.lockBalance(userId, 'code', betAmount, {
                reason: 'bet_lock_attempt_1', // SAME reason (idempotency key)
                timestamp: Date.now()
            });

            // Check balance - should be locked ONCE, not twice
            const lockedBalance = await assetsBus.getLockedBalance(userId, 'code');
            const availableBalance = await assetsBus.getBalance(userId, 'code');

            const passed = (
                lockedBalance === betAmount && // Locked once
                availableBalance === initialBalance - betAmount && // Available reduced by amount
                lock1.lockId !== lock2.lockId // Different lock IDs (or error on second)
            );

            this.recordResult('Disconnect During Lock', passed, {
                initialBalance,
                lockedBalance,
                availableBalance,
                lock1Id: lock1.lockId,
                lock2Id: lock2.lockId
            });

            // Cleanup
            await assetsBus.unlockBalance(lock1.lockId);

            return passed;
        } catch (error) {
            this.recordResult('Disconnect During Lock', false, { error: error.message });
            return false;
        }
    }

    /**
     * TEST 2: Disconnect During Settlement
     * 
     * Scenario:
     * 1. Game completes
     * 2. Settlement begins
     * 3. Connection drops mid-settlement
     * 4. User reconnects
     * 5. Settlement retried
     * 
     * Expected:
     * - No double payout
     * - Winner receives correct amount (once)
     * - Loser balance correct
     * - All locks released
     */
    async testDisconnectDuringSettlement() {
        console.log('🧪 TEST 2: Disconnect During Settlement');

        const player1 = 'test_player_1';
        const player2 = 'test_player_2';
        const betAmount = 100;

        try {
            // Get initial balances
            const p1InitialBalance = await assetsBus.getBalance(player1, 'code');
            const p2InitialBalance = await assetsBus.getBalance(player2, 'code');

            // Create bet
            const betResult = await bettingCore.createBet({
                players: [
                    { userId: player1, amount: betAmount, role: 'player1' },
                    { userId: player2, amount: betAmount, role: 'player2' }
                ],
                gameId: 'test_game',
                asset: 'code'
            });

            if (!betResult.success) {
                throw new Error('Failed to create bet');
            }

            // Simulate game completion - Player 1 wins
            const settlementResult1 = await bettingCore.processBetResult(betResult.betId, {
                winnerId: player1,
                isDraw: false,
                score: 1000
            });

            // Simulate retry (reconnect scenario)
            // This should be idempotent - no double payout
            const settlementResult2 = await bettingCore.processBetResult(betResult.betId, {
                winnerId: player1,
                isDraw: false,
                score: 1000
            });

            // Check final balances
            const p1FinalBalance = await assetsBus.getBalance(player1, 'code');
            const p2FinalBalance = await assetsBus.getBalance(player2, 'code');

            const expectedP1 = p1InitialBalance + betAmount; // Won the pot
            const expectedP2 = p2InitialBalance - betAmount; // Lost bet

            const passed = (
                p1FinalBalance === expectedP1 &&
                p2FinalBalance === expectedP2 &&
                settlementResult2.success === false // Second attempt should fail or be idempotent
            );

            this.recordResult('Disconnect During Settlement', passed, {
                player1: { initial: p1InitialBalance, final: p1FinalBalance, expected: expectedP1 },
                player2: { initial: p2InitialBalance, final: p2FinalBalance, expected: expectedP2 }
            });

            return passed;
        } catch (error) {
            this.recordResult('Disconnect During Settlement', false, { error: error.message });
            return false;
        }
    }

    /**
     * TEST 3: Disconnect During Unlock
     * 
     * Scenario:
     * 1. Bet cancelled or refunded
     * 2. Unlock initiated
     * 3. Connection drops
     * 4. User reconnects
     * 5. Unlock retried
     * 
     * Expected:
     * - Funds unlocked exactly once
     * - No ghost locks remaining
     * - Balance fully restored
     */
    async testDisconnectDuringUnlock() {
        console.log('🧪 TEST 3: Disconnect During Unlock');

        const userId = 'test_user_3';
        const betAmount = 100;

        try {
            const initialBalance = await assetsBus.getBalance(userId, 'code');

            // Lock funds
            const lock = await assetsBus.lockBalance(userId, 'code', betAmount, {
                reason: 'test_unlock'
            });

            // First unlock attempt (may be interrupted)
            const unlock1 = await assetsBus.unlockBalance(lock.lockId);

            // Retry unlock (simulating reconnect)
            const unlock2 = await assetsBus.unlockBalance(lock.lockId);

            // Check final state
            const finalBalance = await assetsBus.getBalance(userId, 'code');
            const lockedBalance = await assetsBus.getLockedBalance(userId, 'code');

            const passed = (
                finalBalance === initialBalance && // Balance fully restored
                lockedBalance === 0 && // No ghost locks
                unlock2.success === false // Second unlock should fail or be idempotent
            );

            this.recordResult('Disconnect During Unlock', passed, {
                initialBalance,
                finalBalance,
                lockedBalance
            });

            return passed;
        } catch (error) {
            this.recordResult('Disconnect During Unlock', false, { error: error.message });
            return false;
        }
    }

    /**
     * TEST 4: Page Refresh Mid-Game
     * 
     * Scenario:
     * 1. Game in progress with active bet
     * 2. User refreshes page
     * 3. Connection re-established
     * 
     * Expected:
     * - Bet state preserved
     * - Locks maintained
     * - Game can continue or be settled
     */
    async testPageRefreshMidGame() {
        console.log('🧪 TEST 4: Page Refresh Mid-Game');

        const userId = 'test_user_4';
        const betAmount = 100;

        try {
            // Create bet
            const betResult = await bettingCore.createBet({
                players: [{ userId, amount: betAmount, role: 'player1' }],
                gameId: 'test_game',
                gameMode: 'solo_ai',
                asset: 'code'
            });

            if (!betResult.success) {
                throw new Error('Failed to create bet');
            }

            const betId = betResult.betId;

            // Simulate page refresh - retrieve active bets
            const activeBets = bettingCore.getActiveBets(userId);

            // Check lock is still present
            const lockedBalance = await assetsBus.getLockedBalance(userId, 'code');

            const passed = (
                activeBets.length > 0 &&
                activeBets.some(bet => bet.betId === betId) &&
                lockedBalance === betAmount
            );

            this.recordResult('Page Refresh Mid-Game', passed, {
                activeBets: activeBets.length,
                lockedBalance
            });

            // Cleanup - settle or cancel bet
            await bettingCore.cancelBet(betId, 'Test cleanup');

            return passed;
        } catch (error) {
            this.recordResult('Page Refresh Mid-Game', false, { error: error.message });
            return false;
        }
    }

    /**
     * TEST 5: Duplicate Event Handling
     * 
     * Scenario:
     * 1. Settlement event sent
     * 2. Network retry sends duplicate event
     * 3. Same event processed twice
     * 
     * Expected:
     * - Idempotent processing
     * - No double effect
     * - Correct final state
     */
    async testDuplicateEventHandling() {
        console.log('🧪 TEST 5: Duplicate Event Handling');

        const player1 = 'test_player_5a';
        const player2 = 'test_player_5b';
        const betAmount = 100;

        try {
            const p1Initial = await assetsBus.getBalance(player1, 'code');

            // Create and immediately settle bet
            const betResult = await bettingCore.createBet({
                players: [
                    { userId: player1, amount: betAmount, role: 'player1' },
                    { userId: player2, amount: betAmount, role: 'player2' }
                ],
                gameId: 'test_game',
                asset: 'code'
            });

            // First settlement
            await bettingCore.processBetResult(betResult.betId, {
                winnerId: player1,
                isDraw: false,
                score: 100
            });

            const p1AfterFirst = await assetsBus.getBalance(player1, 'code');

            // Duplicate settlement attempt
            await bettingCore.processBetResult(betResult.betId, {
                winnerId: player1,
                isDraw: false,
                score: 100
            });

            const p1AfterSecond = await assetsBus.getBalance(player1, 'code');

            const passed = (p1AfterFirst === p1AfterSecond); // No second payout

            this.recordResult('Duplicate Event Handling', passed, {
                initial: p1Initial,
                afterFirst: p1AfterFirst,
                afterSecond: p1AfterSecond
            });

            return passed;
        } catch (error) {
            this.recordResult('Duplicate Event Handling', false, { error: error.message });
            return false;
        }
    }

    /**
     * Record test result
     */
    recordResult(testName, passed, details) {
        const result = {
            test: testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        };

        this.results.push(result);

        if (!passed) {
            this.failed.push(result);
        }

        console.log(passed ? '✅ PASSED' : '❌ FAILED', testName);
        console.log('Details:', details);
    }

    /**
     * Run all tests
     */
    async runAll() {
        console.log('\n🚨 CRITICAL FAILURE TEST SUITE\n');
        console.log('These tests verify system resilience against catastrophic failures.');
        console.log('ALL TESTS MUST PASS before production deployment.\n');

        await this.testDisconnectDuringLock();
        await this.testDisconnectDuringSettlement();
        await this.testDisconnectDuringUnlock();
        await this.testPageRefreshMidGame();
        await this.testDuplicateEventHandling();

        console.log('\n📊 TEST RESULTS\n');
        console.log(`Total Tests: ${this.results.length}`);
        console.log(`Passed: ${this.results.length - this.failed.length}`);
        console.log(`Failed: ${this.failed.length}`);

        if (this.failed.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.failed.forEach(f => {
                console.log(`  - ${f.test}`);
                console.log(`    ${JSON.stringify(f.details, null, 2)}`);
            });
            console.log('\n🚫 SYSTEM NOT READY FOR PRODUCTION');
            return false;
        } else {
            console.log('\n✅ ALL TESTS PASSED');
            console.log('✅ SYSTEM READY FOR PRODUCTION (pending Assets Bus integration)');
            return true;
        }
    }

    /**
     * Generate test report
     */
    generateReport() {
        return {
            summary: {
                total: this.results.length,
                passed: this.results.length - this.failed.length,
                failed: this.failed.length,
                readyForProduction: this.failed.length === 0
            },
            results: this.results,
            failedTests: this.failed
        };
    }
}

/**
 * Test Suite: Islamic Compliance Verification
 */
class IslamicComplianceTests {
    constructor() {
        this.results = [];
        this.failed = [];
    }

    /**
     * TEST 6: Service Fee vs Reward Separation
     * 
     * Verify that rewards come from system pool and are NOT 
     * equal to collected service fees (no zero-sum).
     */
    async testServiceFeeModel() {
        console.log('🧪 TEST 6: Islamic Compliance - Service Fee Model');

        const p1 = 'compliance_user_1';
        const p2 = 'compliance_user_2';

        try {
            // Mode A: Fee 100, Reward 210
            const mode = 'mode_a';
            const expectedFee = 100;
            const expectedReward = 210;

            const result = await competitionCore.createBet({
                players: [{ userId: p1 }, { userId: p2 }],
                gameId: 'compliance_test',
                competitionMode: mode,
                asset: 'code'
            });

            if (!result.success) throw new Error(result.error);

            const competition = result.bet;

            // Verify fee collection
            const p1Fee = competition.players.find(p => p.userId === p1).amount;

            // Settle
            const settleResult = await competitionCore.processBetResult(result.betId, {
                winnerId: p1,
                isDraw: false,
                score: 100
            });

            const payout = settleResult.result.payout;

            const passed = (
                p1Fee === expectedFee &&
                payout === expectedReward &&
                payout > (expectedFee * 2) // Reward > Sum of fees (Proof of System Pool)
            );

            this.recordResult('Service Fee Model', passed, {
                fee: p1Fee,
                reward: payout,
                isZeroSum: payout === (expectedFee * 2)
            });

            return passed;
        } catch (error) {
            this.recordResult('Service Fee Model', false, { error: error.message });
            return false;
        }
    }

    /**
     * TEST 7: Collusion Detection Trigger
     */
    async testCollusionDetection() {
        console.log('🧪 TEST 7: Islamic Compliance - Collusion Detection');

        const p1 = 'collusion_user_1';
        const p2 = 'collusion_user_2';
        const dummyCompId = 'test_comp_collusion';

        try {
            // Simulate alternating wins (Win Trading)
            // Win-Loss-Win-Loss pattern
            await collusionEngine.recordMatch(p1, p2, 'win', 'mode_a', dummyCompId + 1);
            await collusionEngine.recordMatch(p1, p2, 'loss', 'mode_a', dummyCompId + 2);
            await collusionEngine.recordMatch(p1, p2, 'win', 'mode_a', dummyCompId + 3);
            await collusionEngine.recordMatch(p1, p2, 'loss', 'mode_a', dummyCompId + 4);

            // Collusion engine checks patterns on every recordMatch, so it should be flagged now
            const isFlagged = collusionEngine.isFlagged(p1);

            this.recordResult('Collusion Detection', isFlagged, {
                userId: p1,
                reason: collusionEngine.state.suspiciousUsers[p1]?.reason
            });

            return isFlagged;
        } catch (error) {
            this.recordResult('Collusion Detection', false, { error: error.message });
            return false;
        }
    }

    /**
     * TEST 8: Zero-Value Mode Access
     */
    async testZeroValueMode() {
        console.log('🧪 TEST 8: Islamic Compliance - Zero Value Mode');

        const p1 = 'practice_user_1';

        try {
            const result = await competitionCore.createBet({
                players: [{ userId: p1 }],
                gameId: 'practice_test',
                competitionMode: 'practice',
                asset: 'code'
            });

            const competition = result.bet;

            const passed = (
                competition.serviceFee === 0 &&
                competition.systemReward === 0 &&
                competition.competitionMode === 'practice'
            );

            this.recordResult('Zero Value Mode', passed, {
                fee: competition.serviceFee,
                reward: competition.systemReward
            });

            return passed;
        } catch (error) {
            this.recordResult('Zero Value Mode', false, { error: error.message });
            return false;
        }
    }

    recordResult(testName, passed, details) {
        const result = { test: testName, passed, details, timestamp: new Date().toISOString() };
        this.results.push(result);
        if (!passed) this.failed.push(result);
        console.log(passed ? '✅ PASSED' : '❌ FAILED', testName);
        console.log('Details:', details);
    }

    async runAll() {
        console.log('\n☪️ ISLAMIC COMPLIANCE TEST SUITE\n');
        await this.testServiceFeeModel();
        await this.testCollusionDetection();
        await this.testZeroValueMode();

        if (this.failed.length > 0) {
            console.log('\n❌ COMPLIANCE CHECKS FAILED');
            return false;
        }
        console.log('\n✅ ALL COMPLIANCE CHECKS PASSED');
        return true;
    }
}

// Export for use in browser console or test runner
export const criticalTests = new CatastrophicFailureTests();
export const complianceTests = new IslamicComplianceTests();

// Auto-run if in test environment
if (typeof window !== 'undefined' && window.location.search.includes('run-critical-tests')) {
    (async () => {
        const criticalPassed = await criticalTests.runAll();
        const compliancePassed = await complianceTests.runAll();

        const success = criticalPassed && compliancePassed;
        console.log('\n' + (success ? '✅ READY FOR DEPLOYMENT' : '❌ DEPLOYMENT BLOCKED'));
    })();
}
