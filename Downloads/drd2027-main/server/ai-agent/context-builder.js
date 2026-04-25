// server/ai-agent/context-builder.js
// Build rich context from user assets + platform state

import { query } from '../../api/config/db.js';

export const PLATFORM_SERVICES = [
  { id: 'pebalaash', name: 'Pebalaash',      icon: '🛍️', url: '/codebank/pebalaash/',       status: 'active' },
  { id: 'games',     name: 'Games Centre',   icon: '🎮', url: '/codebank/Games-Centre.html',    status: 'active' },
  { id: 'safecode',  name: 'SafeCode',       icon: '🔐', url: '/codebank/safecode/',        status: 'active' },
  { id: 'samma3ny',  name: 'Samma3ny',       icon: '🎵', url: '/codebank/samma3ny.html',        status: 'active' },
  { id: 'farragna',  name: 'Farragna',       icon: '📹', url: '/codebank/farragna/',        status: 'active' },
  { id: 'shots',     name: 'Shots',          icon: '📸', url: '/codebank/shots/',           status: 'active' },
  { id: 'aihub',     name: 'AI Hub',         icon: '🤖', url: '/codebank/aihub/',           status: 'active' },
  { id: 'e7ki',      name: 'E7ki Analytics', icon: '📊', url: '/codebank/e7ki/',            status: 'active' },
  { id: 'ledger',    name: 'Ledger',         icon: '📒', url: '/codebank/bankode/ledger.html',  status: 'active' },
  { id: 'qarsan',    name: 'Qarsan',         icon: '🐕', url: '/codebank/qarsan/',          status: 'active' },
];

function getTier(value) {
  if (value >= 500) return 'Elite 👑';
  if (value >= 100) return 'Premium ⭐';
  if (value >= 25)  return 'Active 🔥';
  return 'Starter 🌱';
}

export async function buildUserContext(userId) {
  let balances = { codes_count: 0, silver_count: 0, gold_count: 0 };
  let userInfo = { email: '', user_type: 'user' };

  try {
    const [balRes, userRes] = await Promise.all([
      query('SELECT codes_count, silver_count, gold_count FROM balances WHERE user_id = $1', [userId]),
      query('SELECT email, user_type FROM users WHERE id = $1', [userId]),
    ]);
    if (balRes.rows?.length)  balances = balRes.rows[0];
    if (userRes.rows?.length) userInfo  = userRes.rows[0];
  } catch (err) {
    console.error('[ContextBuilder] DB error:', err.message);
  }

  const codes  = Number(balances.codes_count)  || 0;
  const silver = Number(balances.silver_count) || 0;
  const gold   = Number(balances.gold_count)   || 0;
  const portfolioValue = codes + (silver * 5) + (gold * 25);

  return {
    userId,
    user: {
      email: userInfo.email,
      role:  userInfo.user_type,
      tier:  getTier(portfolioValue),
    },
    assets: { codes, silver, gold, portfolioValue },
    services: PLATFORM_SERVICES,
    timestamp: new Date().toISOString(),
  };
}

export function contextToText(ctx) {
  const { assets, user } = ctx;
  return [
    'CURRENT USER CONTEXT:',
    `Tier: ${user.tier} | Role: ${user.role}`,
    `Assets: ${assets.codes} codes | ${assets.silver} silver | ${assets.gold} gold`,
    `Portfolio Value: ${assets.portfolioValue} pts`,
    `Services: ${ctx.services.map(s => s.icon + s.name).join(', ')}`,
  ].join('\n');
}
