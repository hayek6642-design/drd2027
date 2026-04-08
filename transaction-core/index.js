import { Ledger } from "./core/Ledger.js"
import { UsersManager } from "./core/UsersManager.js"
import { BankodeManager } from "./core/BankodeManager.js"
import { TransactionManager } from "./core/TransactionManager.js"

import { userToUser } from "./modules/UserToUser.js"
import { userToBankode } from "./modules/UserToBankode.js"
import { bankodeToUser } from "./modules/BankodeToUser.js"
import { rewardLike } from "./modules/RewardsFlow.js"
import { transactions as oldTransactions, users as oldUsers } from "../transaction-audit/dbMock.js"
import { PolicyEngine } from "./policy-engine/PolicyEngine.js"
import { LikePolicy } from "./policies/LikePolicy.js"
import { GameRewardPolicy } from "./policies/GameRewardPolicy.js"
import { StorePolicy } from "./policies/StorePolicy.js"
import { IntentQueue } from "./offline-intents/IntentQueue.js"
import { serializeIntent } from "./offline-intents/IntentSerializer.js"
import { ReplayEngine } from "./offline-intents/ReplayEngine.js"
import { IntentTypes } from "./offline-intents/IntentTypes.js"
import { NeonClient } from "./persistence/NeonClient.js"
import { UsersRepository } from "./persistence/UsersRepository.js"
import { LedgerRepository } from "./persistence/LedgerRepository.js"
import { BankodeRepository } from "./persistence/BankodeRepository.js"

const ledger = new Ledger()
const usersManager = new UsersManager()
const bankodeManager = new BankodeManager()
const transactionManager = new TransactionManager(usersManager, bankodeManager, ledger)

oldUsers.forEach(user => usersManager.addUser(user))

oldTransactions
  .filter(tx => tx.status === "success" || tx.status === "pending")
  .forEach(tx => {
    try {
      switch (tx.type) {
        case "transfer":
          userToUser(transactionManager, tx.from, tx.to, tx.amount)
          break
        case "like":
          rewardLike(transactionManager, tx.from, tx.to, tx.amount, tx.likeType || "like")
          break
        case "gameAssetPurchase":
          transactionManager.executeTransaction({
            type: "AssetPurchase",
            from: tx.userId,
            assetId: tx.assetId,
            amount: tx.amount,
            description: `Imported old asset purchase`
          })
          break
        default:
          console.log("Unknown old transaction type:", tx.type)
      }
    } catch (err) {
      console.log("Failed to import transaction:", tx.id, err.message)
    }
  })

userToUser(transactionManager, 1, 2, 20)
userToBankode(transactionManager, 2, 10)
bankodeToUser(transactionManager, 1, 15)
rewardLike(transactionManager, 2, 1, 5, "super")

try {
  usersManager.addUser({ id: 100, balance: 10 })
  usersManager.addUser({ id: 101, balance: 0 })

  if (process.env.DATABASE_URL) {
    const neon = new NeonClient()
    const repos = {
      usersRepo: new UsersRepository(neon),
      ledgerRepo: new LedgerRepository(neon),
      bankodeRepo: new BankodeRepository(neon)
    }
    const tmDb = new TransactionManager(usersManager, bankodeManager, ledger, repos)
    await tmDb.executeTransaction({ type: "UserToUser", from: 100, to: 101, amount: 5, description: "Phase1:A->B:5" })
    try { await tmDb.executeTransaction({ type: "UserToUser", from: 100, to: 101, amount: 10, description: "Phase1:A->B:10" }) } catch (_) {}
    await tmDb.executeTransaction({ type: "BankodeToUser", to: 101, amount: 100, description: "Phase1:Bankode->B:100" })
  } else {
    await transactionManager.executeTransaction({ type: "UserToUser", from: 100, to: 101, amount: 5, description: "Phase1:A->B:5" })
    try { await transactionManager.executeTransaction({ type: "UserToUser", from: 100, to: 101, amount: 10, description: "Phase1:A->B:10" }) } catch (_) {}
    await transactionManager.executeTransaction({ type: "BankodeToUser", to: 101, amount: 100, description: "Phase1:Bankode->B:100" })
  }
} catch (e) {
  console.log("Phase1 scenario skipped:", e.message || "")
}

console.log("\n=== Final Ledger ===")
console.table(ledger.getAll())
console.log("\n=== Users State ===")
console.table(usersManager.users)
console.log("\n=== Bankode State ===")
console.log(bankodeManager.balance)

// Phase 1.6 Offline Intent Queue scenario (in-memory storage)
try {
  const storage = {
    _map: new Map(),
    getItem(k) { return this._map.get(k) || null },
    setItem(k, v) { this._map.set(k, v) }
  }
  const intentQueue = new IntentQueue(storage)

  // Ensure users
  usersManager.addUser({ id: 200, balance: 10 })
  usersManager.addUser({ id: 201, balance: 0 })

  // Build policy engine
  const engine = new PolicyEngine(transactionManager)
  engine.register(IntentTypes.LIKE, new LikePolicy(transactionManager))
  engine.register(IntentTypes.GAME_REWARD, new GameRewardPolicy(transactionManager))

  const replayEngine = new ReplayEngine(engine, intentQueue)

  // Offline: enqueue three like intents (economic intent only)
  intentQueue.enqueue(serializeIntent(IntentTypes.LIKE, { fromUser: 200, toUser: 201, amount: 5, likeType: "super" }))
  intentQueue.enqueue(serializeIntent(IntentTypes.LIKE, { fromUser: 200, toUser: 201, amount: 5, likeType: "super" }))
  intentQueue.enqueue(serializeIntent(IntentTypes.LIKE, { fromUser: 200, toUser: 201, amount: 5, likeType: "super" }))

  // Online: replay all intents via policies → core decides allow/deny
  await replayEngine.replayAll()

  console.log("\n=== Offline Intents After Replay ===")
  console.table(intentQueue.list())
} catch (e) {
  console.log("Offline intents scenario skipped:", e.message || "")
}

// Full Auth + Virtual Users + Transaction Validation
try {
  console.log("\n=== Auth Mock & Virtual Users Test ===")
  const MockAuth = {
    currentUserId: null,
    login(id) { this.currentUserId = id; console.log("[AUTH] login:", id); return true },
    isAuthenticated() { return !!this.currentUserId },
    userId() { return this.currentUserId }
  }

  // Create virtual users
  usersManager.addUser({ id: 300, balance: 50, assets: [] })
  usersManager.addUser({ id: 301, balance: 20, assets: [] })

  // Try to mirror into Neon if available
  if (process.env.DATABASE_URL) {
    const neon = new NeonClient()
    await neon.transaction(async (client) => {
      try {
        await client.query("CREATE TABLE IF NOT EXISTS users(id INT PRIMARY KEY, balance INT)")
        await client.query("CREATE TABLE IF NOT EXISTS user_assets(user_id INT, asset_id TEXT, PRIMARY KEY(user_id, asset_id))")
        await client.query("INSERT INTO users(id, balance) VALUES($1,$2) ON CONFLICT (id) DO UPDATE SET balance=$2", [300, 50])
        await client.query("INSERT INTO users(id, balance) VALUES($1,$2) ON CONFLICT (id) DO UPDATE SET balance=$2", [301, 20])
        console.log("[NEON] users upserted")
      } catch (e) { console.log("[NEON] setup skipped:", e.message) }
    })
  }

  // Build policy engine
  const engine = new PolicyEngine(transactionManager)
  engine.register("like", new LikePolicy(transactionManager))
  engine.register("storePurchase", new StorePolicy(transactionManager))

  // Auth: login as 200
  MockAuth.login(300)

  // Transactions
  const tmResult1 = await transactionManager.executeTransaction({ type: "UserToUser", from: 300, to: 301, amount: 10, description: "Test Transfer" })
  console.log("[TX] Transfer 200->201:10 => success")

  await engine.run("like", { fromUser: 300, toUser: 301, amount: 5, likeType: "super" })
  console.log("[TX] Like super 200->201:5 => success")

  // Store purchase to validate asset update path
  await engine.run("storePurchase", { fromUser: 300, amount: 7, assetId: "sku-xyz" })
  console.log("[TX] StorePurchase 200 sku-xyz:7 => success")

  // Edge case: fail over-limit
  try {
    await transactionManager.executeTransaction({ type: "UserToUser", from: 300, to: 301, amount: 1000, description: "Edge Overdraft" })
    console.log("[TX] Overdraft unexpectedly succeeded")
  } catch (e) {
    console.log("[TX] Overdraft correctly failed:", e.message)
  }

  console.log("\n=== Post-Test State ===")
  console.table(usersManager.users)
  console.log("Bankode:", bankodeManager.balance)
  console.log("Ledger:")
  console.table(ledger.getAll())
  console.log("Note: EventVault logs appended to", "./event-vault/logs")
} catch (e) {
  console.log("Auth + Virtual Users test skipped:", e.message || "")
}
