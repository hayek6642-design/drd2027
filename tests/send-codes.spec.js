// Basic integration tests for /api/send-codes
// Requires server running on http://127.0.0.1:3001 and DATABASE_URL set

import 'dotenv/config'
import assert from 'node:assert/strict'
import { setTimeout as wait } from 'node:timers/promises'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3001'
const DB_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL
if (!DB_URL) {
  console.error('Missing DATABASE_URL for tests')
  process.exit(1)
}

async function signup(email){
  const r = await fetch(`${BASE}/api/auth/signup`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, password:'p@ssw0rd' }) })
  const setCookie = r.headers.get('set-cookie') || ''
  assert.ok(r.ok, 'signup failed')
  const j = await r.json()
  const userId = j && j.userId
  assert.ok(userId, 'missing userId')
  const token = /session_token=([^;]+)/.exec(setCookie)?.[1]
  assert.ok(token, 'missing session cookie')
  return { userId, cookie: `session_token=${token}` }
}

async function seedCodes(pool, userId, n){
  const client = await pool.connect()
  try {
    for (let i=0;i<n;i++){
      const code = `TST-${Math.random().toString(36).slice(2,8).toUpperCase()}-${i}`
      await client.query("INSERT INTO codes(user_id, code) VALUES($1::uuid, $2)", [userId, code])
    }
  } finally { client.release() }
}

async function ensureBalance(pool, userId, amount){
  const client = await pool.connect()
  try {
    await client.query("INSERT INTO balances(user_id, asset, amount) VALUES($1::uuid,'codebank',$2) ON CONFLICT (user_id, asset) DO UPDATE SET amount=$2, updated_at=NOW()", [userId, amount])
  } finally { client.release() }
}

async function getCounts(pool, userId){
  const client = await pool.connect()
  try {
    const r1 = await client.query('SELECT count(*)::int AS c FROM codes WHERE user_id=$1::uuid', [userId])
    const r2 = await client.query("SELECT amount::int AS a FROM balances WHERE user_id=$1::uuid AND asset='codebank'", [userId])
    return { codes: r1.rows[0].c, balance: r2.rows[0] ? r2.rows[0].a : 0 }
  } finally { client.release() }
}

;(async function run(){
  const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
  const A = await signup(`sender+${Date.now()}@test.dev`)
  const BEmail = `receiver+${Date.now()}@test.dev`
  const B = await signup(BEmail)

  await seedCodes(pool, A.userId, 6)
  await ensureBalance(pool, A.userId, 6)
  await ensureBalance(pool, B.userId, 0)

  // Success
  const codesRes = await pool.query('SELECT code FROM codes WHERE user_id=$1::uuid LIMIT 2', [A.userId])
  const codes = codesRes.rows.map(r=>r.code)
  const idem = randomUUID()
  const r1 = await fetch(`${BASE}/api/send-codes`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Idempotency-Key': idem, 'Cookie': A.cookie }, body: JSON.stringify({ codes, receiverEmail: BEmail }) })
  assert.equal(r1.status, 200, 'expected success for first transfer')
  const j1 = await r1.json(); assert.ok(j1 && j1.success, 'response not success')
  await wait(200)
  const cA1 = await getCounts(pool, A.userId)
  const cB1 = await getCounts(pool, B.userId)
  assert.ok(cA1.balance === 6 - codes.length, 'sender balance not deducted')
  assert.ok(cB1.balance === codes.length, 'receiver balance not credited')

  // Idempotent retry
  const r2 = await fetch(`${BASE}/api/send-codes`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Idempotency-Key': idem, 'Cookie': A.cookie }, body: JSON.stringify({ codes, receiverEmail: BEmail }) })
  assert.equal(r2.status, 200, 'expected idempotent success')
  const cA2 = await getCounts(pool, A.userId)
  const cB2 = await getCounts(pool, B.userId)
  assert.equal(cA2.balance, cA1.balance, 'idempotent retry should not change balance (sender)')
  assert.equal(cB2.balance, cB1.balance, 'idempotent retry should not change balance (receiver)')

  // Insufficient funds
  await ensureBalance(pool, A.userId, 0)
  const oneCodeRes = await pool.query('SELECT code FROM codes WHERE user_id=$1::uuid LIMIT 1', [A.userId])
  const oneCode = oneCodeRes.rows[0] && oneCodeRes.rows[0].code
  const r3 = await fetch(`${BASE}/api/send-codes`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Cookie': A.cookie }, body: JSON.stringify({ codes:[oneCode], receiverEmail: BEmail }) })
  assert.equal(r3.status, 400, 'expected insufficient funds 400')
  const j3 = await r3.json(); assert.equal(j3 && j3.message, 'insufficient_funds')

  // Invalid recipient
  const r4 = await fetch(`${BASE}/api/send-codes`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Cookie': A.cookie }, body: JSON.stringify({ codes:[oneCode], receiverEmail: 'not-found@example.invalid' }) })
  assert.equal(r4.status, 404, 'expected user_not_found 404')

  // Concurrent transfers
  await ensureBalance(pool, A.userId, 2)
  await seedCodes(pool, A.userId, 2)
  const concRes = await pool.query('SELECT code FROM codes WHERE user_id=$1::uuid LIMIT 2', [A.userId])
  const concCodes = concRes.rows.map(r=>r.code)
  const [c1, c2] = await Promise.all([
    fetch(`${BASE}/api/send-codes`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Idempotency-Key': randomUUID(), 'Cookie': A.cookie }, body: JSON.stringify({ codes: concCodes, receiverEmail: BEmail }) }),
    fetch(`${BASE}/api/send-codes`, { method:'POST', headers:{ 'Content-Type':'application/json', 'Idempotency-Key': randomUUID(), 'Cookie': A.cookie }, body: JSON.stringify({ codes: concCodes, receiverEmail: BEmail }) })
  ])
  assert.ok(c1.status === 200 || c2.status === 200, 'one should succeed')
  assert.ok(c1.status !== 200 || c2.status !== 200, 'one should fail due to lock/ownership')

  console.log('All /api/send-codes tests passed')
  await pool.end()
  process.exit(0)
})();
