import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import challenge from './challenge.js';
import { pipeline, loadModels } from './pipeline.js';
import scoring from './scoring.js';
import { computeAntiFraudConfidence } from './anticheat.js';
import { computeDifficulty } from './difficulty.js';
import { getCurrentSeason, assignTier } from './season.js';
import { generateIdentityFingerprint } from './identity.js';
import { calculateReward } from './economy.js';
import { resolveTier } from './tiers.js';
import { recordTransaction } from './ledger.js';
import { applySponsorBonus } from './sponsors.js';
import { phase5Decision } from './governor.js';

const { getCurrentChallenge } = challenge;
const { computeScore } = scoring;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '../../uploads/piccarboon');
const DIRS = {
  challenges: path.join(ROOT, 'challenges'),
  reference: path.join(ROOT, 'reference'),
  submissions: path.join(ROOT, 'submissions'),
  scores: path.join(ROOT, 'scores'),
  fraud: path.join(ROOT, 'fraud'),
  winners: path.join(ROOT, 'winners'),
  losers: path.join(ROOT, 'losers'),
  sponsor: path.join(ROOT, 'sponsor'),
};

for (const key of Object.keys(DIRS)) {
  if (!fs.existsSync(DIRS[key])) fs.mkdirSync(DIRS[key], { recursive: true });
}

function loadJSONSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
}

function saveSubmission(meta) {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2);
  const filePath = path.join(DIRS.submissions, id + '.json');
  fs.writeFileSync(filePath, JSON.stringify(meta, null, 2));
  return { id, filePath };
}

function saveScore(id, scoreObj) {
  const out = path.join(DIRS.scores, `${id}.json`);
  fs.writeFileSync(out, JSON.stringify(scoreObj, null, 2));
}

function saveFraud(id, fraudObj) {
  const out = path.join(DIRS.fraud, `${id}.json`);
  fs.writeFileSync(out, JSON.stringify(fraudObj, null, 2));
}

function registerOutcome(id, score, antiFraudConfidence, imageUrl) {
  const destDir = antiFraudConfidence < 60 ? DIRS.losers : (score >= 80 ? DIRS.winners : DIRS.losers);
  const record = { id, score, antiFraudConfidence, image_url: imageUrl, timestamp: new Date().toISOString() };
  const out = path.join(destDir, `${id}.json`);
  fs.writeFileSync(out, JSON.stringify(record, null, 2));
}

// Use simple pipeline placeholders from pipeline.js and CommonJS helpers

export const PiccarboonOrchestrator = {
  getDailyChallenge() { return getCurrentChallenge(); },
  async submit({ imageUrl, features }) {
    const challenge = getCurrentChallenge();
    if (!challenge) return { status: 'error', message: 'No challenge found' };
    await loadModels();
    const antiFraudConfidence = await computeAntiFraudConfidence(imageUrl, features.previousFrames || []);
    if (antiFraudConfidence < 60) {
      const sub = saveSubmission({ imageUrl, features, challenge, timestamp: new Date().toISOString() });
      saveFraud(sub.id, { antiFraudConfidence, features });
      registerOutcome(sub.id, 0, antiFraudConfidence, imageUrl);
      return { id: sub.id, status: 'rejected', antiFraudConfidence };
    }
    const aiResults = await pipeline(imageUrl);
    const sc = computeScore(aiResults, challenge, antiFraudConfidence);
    const finalScore = sc.final;
    const sub = saveSubmission({ imageUrl, features, challenge, aiResults, components: sc.components, finalScore, antiFraudConfidence, timestamp: new Date().toISOString() });
    const leaderboard = this.leaderboard();
    const rank = leaderboard.findIndex(e => e.id === sub.id) + 1;
    const difficulty = computeDifficulty(leaderboard.slice(0, 10).map(e => e.score));
    const season = getCurrentSeason();
    const tier = resolveTier(finalScore);
    const identity = generateIdentityFingerprint(features);
    const rankBuckets = { global: true, difficulty, season };
    const mediaType = "image";
    const motionScore = (features.liveFramesVariance || 0) * 100;
    const decision = phase5Decision({ pbs: finalScore, antiFraud: antiFraudConfidence });
    const sponsored = !!challenge.sponsor;
    const boostedScore = applySponsorBonus(challenge, finalScore);
    const reward = calculateReward({ pbs: boostedScore, tier, sponsored });
    recordTransaction({
      userId: sub.id,
      reward,
      tier,
      decision
    });
    const result = { id: sub.id, score: finalScore, antiFraudConfidence, difficulty, season, tier, boostUsed: false, identity, rankBuckets, mediaType, motionScore, decision, reward };
    saveScore(sub.id, result);
    registerOutcome(sub.id, finalScore, antiFraudConfidence, imageUrl);
    return { ...result, status: decision === 'WINNER' ? 'winner' : decision === 'LOSER' ? 'loser' : 'dismissed' };
  },
  leaderboard() {
    const files = fs.readdirSync(DIRS.scores).filter(f=>f.endsWith('.json'));
    const entries = files.map(f=>loadJSONSafe(path.join(DIRS.scores,f))).filter(Boolean);
    return entries.sort((a,b)=> (b.score - a.score)).slice(0,50);
  },
  winners() {
    const files = fs.readdirSync(DIRS.winners).filter(f=>f.endsWith('.json'));
    return files.map(f=>loadJSONSafe(path.join(DIRS.winners,f))).filter(Boolean).sort((a,b)=> (a.timestamp > b.timestamp ? -1 : 1));
  },
  losers() {
    const files = fs.readdirSync(DIRS.losers).filter(f=>f.endsWith('.json'));
    return files.map(f=>loadJSONSafe(path.join(DIRS.losers,f))).filter(Boolean).sort((a,b)=> (a.timestamp > b.timestamp ? -1 : 1));
  },
};

export default PiccarboonOrchestrator;
