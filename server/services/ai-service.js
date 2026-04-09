// server/services/ai-service.js
// Google AI Studio (Gemma 4) — Server-side AI, no Ollama needed!

import crypto from 'crypto';

// ─── Models ────────────────────────────────────────────────────
const MODELS = {
  manager: 'gemma-3-27b-it',
  code:    'gemma-3-12b-it',
  fast:    'gemma-3-4b-it',
};

const DAILY_QUOTA = 1500;
const CACHE_TTL   = 60 * 60 * 1000; // 1 hour in ms

// ─── State ─────────────────────────────────────────────────────
let quotaState = {
  used:    0,
  date:    new Date().toDateString(),
  resetAt: Date.now() + 24 * 60 * 60 * 1000,
};

const responseCache = new Map(); // MD5 key → { text, expiresAt }

// ─── Quota ─────────────────────────────────────────────────────
function checkAndResetQuota() {
  const today = new Date().toDateString();
  if (quotaState.date !== today) {
    quotaState = { used: 0, date: today, resetAt: Date.now() + 24 * 60 * 60 * 1000 };
  }
}

export function getQuotaStats() {
  checkAndResetQuota();
  return {
    used:       quotaState.used,
    remaining:  Math.max(0, DAILY_QUOTA - quotaState.used),
    total:      DAILY_QUOTA,
    resetAt:    quotaState.resetAt,
    percentage: Math.round((quotaState.used / DAILY_QUOTA) * 100),
  };
}

// ─── Cache ─────────────────────────────────────────────────────
function makeCacheKey(model, messages) {
  const raw = JSON.stringify({ model, messages });
  return crypto.createHash('md5').update(raw).digest('hex');
}

function getFromCache(key) {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { responseCache.delete(key); return null; }
  return entry.text;
}

function saveToCache(key, text) {
  responseCache.set(key, { text, expiresAt: Date.now() + CACHE_TTL });
  if (responseCache.size > 500) {
    const oldest = responseCache.keys().next().value;
    responseCache.delete(oldest);
  }
}

// ─── Core API ──────────────────────────────────────────────────
export async function generateWithGemma(messages, modelKey = 'manager', useCache = true) {
  checkAndResetQuota();

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured in environment');

  const stats = getQuotaStats();
  if (stats.remaining <= 0) throw new Error('Daily quota exhausted. Resets at midnight.');

  const model    = MODELS[modelKey] || MODELS.manager;
  const cacheKey = makeCacheKey(model, messages);

  if (useCache) {
    const cached = getFromCache(cacheKey);
    if (cached) return { text: cached, cached: true, model };
  }

  // Separate system from conversation messages
  let systemInstruction = null;
  const contents = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction = m.content;
    } else {
      contents.push({
        role:  m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }
  }

  const body = {
    contents,
    generationConfig: {
      temperature:     0.75,
      topK:            40,
      topP:            0.95,
      maxOutputTokens: 800,
    },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemma API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Empty response from Gemma API');

  quotaState.used++;
  if (useCache) saveToCache(cacheKey, text);

  return { text, cached: false, model };
}
