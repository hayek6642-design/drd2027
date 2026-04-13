import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();
const ENTRY_FEE = 100;

/**
 * Prize formula (matches spec):
 * 2 players  → 200 + 5×2  = 210  ✓
 * 4 players  → 400 + 10×4 = 440  ✓
 * N (N≥3)    → N×100 + N×10 = N×110
 */
function calculatePrize(numPlayers) {
  const n = parseInt(numPlayers, 10);
  const pot = n * ENTRY_FEE;
  const bonus = n === 2 ? 5 * n : 10 * n;
  return pot + bonus;
}

/* ─── DB Schema Bootstrap ──────────────────────────────── */
export async function ensureGambleTables() {
  await query(`CREATE TABLE IF NOT EXISTS gamble_rooms (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    game_name TEXT,
    status TEXT NOT NULL DEFAULT 'waiting',
    num_players_target INTEGER NOT NULL,
    num_players_joined INTEGER NOT NULL DEFAULT 0,
    entry_fee INTEGER NOT NULL DEFAULT 100,
    prize_pool INTEGER NOT NULL,
    creator_id TEXT NOT NULL,
    winner_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
  )`);
  await query(`CREATE TABLE IF NOT EXISTS gamble_players (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT,
    score INTEGER DEFAULT 0,
    turn_order INTEGER DEFAULT 0,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
  )`);
  await query(`CREATE TABLE IF NOT EXISTS gamble_ledger (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}
ensureGambleTables().catch(e => console.error('[GAMBLE] Table init:', e.message));

/* helpers */
async function debitCodes(userId, amount, roomId) {
  await query('UPDATE users SET codes_count = codes_count - $1 WHERE id = $2', [amount, userId]);
  await query('INSERT INTO balances (user_id, codes_count) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET codes_count = codes_count - $2, updated_at = CURRENT_TIMESTAMP', [userId, amount]);
  await query("INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1,$2,'debit','codes',$3,$4)", [crypto.randomUUID(), userId, amount, `gamble:entry:${roomId}`]);
  await query("INSERT INTO gamble_ledger (id,room_id,user_id,type,amount,note) VALUES ($1,$2,$3,'entry',$4,'Entry fee')", [crypto.randomUUID(), roomId, userId, amount]);
}

async function creditCodes(userId, amount, roomId, type, note) {
  await query('UPDATE users SET codes_count = codes_count + $1 WHERE id = $2', [amount, userId]);
  await query('INSERT INTO balances (user_id, codes_count) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET codes_count = codes_count + $2, updated_at = CURRENT_TIMESTAMP', [userId, amount]);
  await query("INSERT INTO ledger (tx_id, user_id, direction, asset_type, amount, reference) VALUES ($1,$2,'credit','codes',$3,$4)", [crypto.randomUUID(), userId, amount, `gamble:${type}:${roomId}`]);
  await query('INSERT INTO gamble_ledger (id,room_id,user_id,type,amount,note) VALUES ($1,$2,$3,$4,$5,$6)', [crypto.randomUUID(), roomId, userId, type, amount, note]);
}

/* ─── POST /api/gamble/room ─── Create a room */
router.post('/room', requireAuth, async (req, res) => {
  try {
    const { gameId, gameName, numPlayers } = req.body;
    const userId = req.userId || req.user?.id || req.user?.userId || req.user?.sub;
    const n = parseInt(numPlayers, 10);
    if (!gameId || isNaN(n) || n < 2 || n > 8)
      return res.status(400).json({ success: false, error: 'gameId required; numPlayers must be 2–8' });

    const prizePool = calculatePrize(n);
    const roomId = crypto.randomUUID();
    await query(
      `INSERT INTO gamble_rooms (id,game_id,game_name,status,num_players_target,entry_fee,prize_pool,creator_id) VALUES ($1,$2,$3,'waiting',$4,$5,$6,$7)`,
      [roomId, gameId, gameName || gameId, n, ENTRY_FEE, prizePool, userId]
    );
    return res.json({ success: true, roomId, prizePool, entryFee: ENTRY_FEE, numPlayers: n });
  } catch (e) {
    console.error('[GAMBLE] create-room:', e.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

/* ─── POST /api/gamble/room/:id/join ─── Join & pay entry */
router.post('/room/:id/join', requireAuth, async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.userId || req.user?.id || req.user?.userId || req.user?.sub;
    const username = (req.body.username || 'Player').slice(0, 32);

    const roomRes = await query('SELECT * FROM gamble_rooms WHERE id=$1', [roomId]);
    if (!roomRes.rows.length) return res.status(404).json({ success: false, error: 'Room not found' });
    const room = roomRes.rows[0];

    if (room.status !== 'waiting') return res.status(400).json({ success: false, error: 'Room not open for joining' });
    if (room.num_players_joined >= room.num_players_target) return res.status(400).json({ success: false, error: 'Room full' });

    const existRes = await query('SELECT id FROM gamble_players WHERE room_id=$1 AND user_id=$2', [roomId, userId]);
    if (existRes.rows.length) return res.status(400).json({ success: false, error: 'Already in room' });

    const balRes = await query('SELECT codes_count FROM users WHERE id=$1', [userId]);
    const bal = Number(balRes.rows[0]?.codes_count || 0);
    if (bal < ENTRY_FEE) return res.status(400).json({ success: false, error: 'insufficient_balance', required: ENTRY_FEE, balance: bal });

    const turnOrder = (room.num_players_joined || 0) + 1;
    await debitCodes(userId, ENTRY_FEE, roomId);
    await query('INSERT INTO gamble_players (id,room_id,user_id,username,turn_order) VALUES ($1,$2,$3,$4,$5)',
      [crypto.randomUUID(), roomId, userId, username, turnOrder]);

    const newCount = turnOrder;
    let status = 'waiting';
    if (newCount >= room.num_players_target) {
      status = 'active';
      await query("UPDATE gamble_rooms SET num_players_joined=$1, status='active', started_at=CURRENT_TIMESTAMP WHERE id=$2", [newCount, roomId]);
    } else {
      await query('UPDATE gamble_rooms SET num_players_joined=$1 WHERE id=$2', [newCount, roomId]);
    }

    return res.json({ success: true, roomId, prizePool: room.prize_pool, playersJoined: newCount, target: room.num_players_target, status, turnOrder });
  } catch (e) {
    console.error('[GAMBLE] join-room:', e.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

/* ─── POST /api/gamble/room/:id/score ─── Submit score for turn */
router.post('/room/:id/score', requireAuth, async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.userId || req.user?.id || req.user?.userId || req.user?.sub;
    const score = parseInt(req.body.score, 10) || 0;

    const roomRes = await query('SELECT status FROM gamble_rooms WHERE id=$1', [roomId]);
    if (!roomRes.rows.length) return res.status(404).json({ success: false, error: 'Room not found' });
    if (roomRes.rows[0].status !== 'active') return res.status(400).json({ success: false, error: 'Room not active' });

    await query('UPDATE gamble_players SET score=$1 WHERE room_id=$2 AND user_id=$3', [score, roomId, userId]);
    return res.json({ success: true, score });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

/* ─── POST /api/gamble/room/:id/declare-winner ─── Pay out prize */
router.post('/room/:id/declare-winner', requireAuth, async (req, res) => {
  try {
    const roomId = req.params.id;
    const { winnerId, winnerScore } = req.body;
    const userId = req.userId || req.user?.id || req.user?.userId || req.user?.sub;

    const roomRes = await query('SELECT * FROM gamble_rooms WHERE id=$1', [roomId]);
    if (!roomRes.rows.length) return res.status(404).json({ success: false, error: 'Room not found' });
    const room = roomRes.rows[0];
    if (room.status !== 'active') return res.status(400).json({ success: false, error: 'Room not active' });

    const callerRes = await query('SELECT id FROM gamble_players WHERE room_id=$1 AND user_id=$2', [roomId, userId]);
    if (!callerRes.rows.length) return res.status(403).json({ success: false, error: 'Not in room' });

    const targetWinner = winnerId || userId;
    if (winnerScore !== undefined)
      await query('UPDATE gamble_players SET score=$1 WHERE room_id=$2 AND user_id=$3', [winnerScore, roomId, targetWinner]);

    await creditCodes(targetWinner, room.prize_pool, roomId, 'win', `Won ${room.prize_pool} codes in ${room.game_name}`);
    await query("UPDATE gamble_rooms SET status='completed', winner_id=$1, completed_at=CURRENT_TIMESTAMP WHERE id=$2", [targetWinner, roomId]);

    return res.json({ success: true, winnerId: targetWinner, prizePool: room.prize_pool });
  } catch (e) {
    console.error('[GAMBLE] declare-winner:', e.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

/* ─── POST /api/gamble/room/:id/cancel ─── Cancel & refund */
router.post('/room/:id/cancel', requireAuth, async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = req.userId || req.user?.id || req.user?.userId || req.user?.sub;

    const roomRes = await query('SELECT * FROM gamble_rooms WHERE id=$1', [roomId]);
    if (!roomRes.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    const room = roomRes.rows[0];
    if (room.status === 'completed') return res.status(400).json({ success: false, error: 'Already completed' });
    if (room.creator_id !== userId) return res.status(403).json({ success: false, error: 'Only creator can cancel' });

    const playersRes = await query('SELECT user_id FROM gamble_players WHERE room_id=$1', [roomId]);
    for (const p of playersRes.rows) {
      await creditCodes(p.user_id, ENTRY_FEE, roomId, 'refund', 'Room cancelled — full refund');
    }
    await query("UPDATE gamble_rooms SET status='cancelled', completed_at=CURRENT_TIMESTAMP WHERE id=$1", [roomId]);
    return res.json({ success: true, refunded: playersRes.rows.length });
  } catch (e) {
    console.error('[GAMBLE] cancel:', e.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

/* ─── GET /api/gamble/room/:id ─── Room status */
router.get('/room/:id', requireAuth, async (req, res) => {
  try {
    const roomRes = await query('SELECT * FROM gamble_rooms WHERE id=$1', [req.params.id]);
    if (!roomRes.rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    const playersRes = await query('SELECT user_id,username,score,turn_order FROM gamble_players WHERE room_id=$1 ORDER BY turn_order', [req.params.id]);
    return res.json({ success: true, room: roomRes.rows[0], players: playersRes.rows });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

/* ─── GET /api/gamble/rooms/active ─── Open rooms */
router.get('/rooms/active', requireAuth, async (req, res) => {
  try {
    const { gameId } = req.query;
    let sql = "SELECT * FROM gamble_rooms WHERE status='waiting'";
    const params = [];
    if (gameId) { sql += ' AND game_id=$1'; params.push(gameId); }
    sql += ' ORDER BY created_at DESC LIMIT 20';
    const result = await query(sql, params);
    return res.json({ success: true, rooms: result.rows });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

/* ─── GET /api/gamble/history ─── Player history */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT gl.*, gr.game_name, gr.prize_pool, gr.winner_id, gr.status
       FROM gamble_ledger gl JOIN gamble_rooms gr ON gl.room_id=gr.id
       WHERE gl.user_id=$1 ORDER BY gl.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    return res.json({ success: true, history: result.rows });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

/* ─── GET /api/gamble/stats ─── Stats */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const tot = await query("SELECT COUNT(*) as cnt, COALESCE(SUM(prize_pool),0) as total FROM gamble_rooms WHERE status='completed'");
    const pw = await query("SELECT COUNT(*) as wins, COALESCE(SUM(amount),0) as total_won FROM gamble_ledger WHERE user_id=$1 AND type='win'", [req.user.id]);
    return res.json({
      success: true,
      platform: { completedGames: Number(tot.rows[0]?.cnt || 0), totalPrize: Number(tot.rows[0]?.total || 0) },
      player: { wins: Number(pw.rows[0]?.wins || 0), totalWon: Number(pw.rows[0]?.total_won || 0) }
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
});

export default router;
