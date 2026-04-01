import { canUserDebit, ensureAtomic } from './EconomicRules.js'
import { EventVault } from '../event-vault/EventVault.js'
import { uuid as genUuid } from '../../shared/logicode/modules/logicode-utils.js'

export class TransactionManager {
  constructor(usersManager, bankodeManager, ledger, repos = null) {
    this.usersManager = usersManager
    this.bankodeManager = bankodeManager
    this.ledger = ledger
    this.repos = repos
  }

  async executeTransaction({ type, from, to, amount, assetId, description, id }) {
    try {
      const txId = id || genUuid()
      if (type === "UserToUser" || type === "UserToBankode" || type === "AssetPurchase") {
        if (!canUserDebit(this.usersManager, from, amount)) {
          throw new Error("User balance cannot be negative")
        }
      }

      // VAULT-FIRST: Always insert event into event_vault first
      let eventId = null
      if (this.repos && this.repos.eventVaultRepo) {
        eventId = await this.repos.eventVaultRepo.insert({ 
          event_type: type, 
          actor_user_id: from || null, 
          target_user_id: to || null, 
          amount, 
          asset_id: assetId || null, 
          metadata: { description: description || null }, 
          status: "success" 
        })
        if (!eventId) throw new Error("Event vault insertion failed")
      }

      // LEDGER PROJECTION: Project to ledger immediately after vault insertion
      if (this.repos && this.repos.ledgerRepo && eventId) {
        await this.repos.ledgerRepo.projectFromEvent(eventId)
      }

      // BALANCES PROJECTION: Apply balances updates
      if (this.repos && this.repos.balancesRepo && this.repos.eventVaultRepo && this.repos.ledgerRepo && this.repos.eventVaultRepo.client && typeof this.repos.eventVaultRepo.client.transaction === 'function') {
        // Use transaction for atomic operations when client supports it
        await this.repos.usersRepo.client.transaction(async (client) => {
          switch (type) {
            case "UserToUser": {
              this.usersManager.updateBalance(from, -amount)
              this.usersManager.updateBalance(to, amount)
              await this.repos.balancesRepo.applyTransfer(from, to, amount, client)
              break
            }
            case "UserToBankode": {
              this.usersManager.updateBalance(from, -amount)
              const bankBal = this.bankodeManager.deposit(amount)
              await this.repos.balancesRepo.applyDebit(from, amount, client)
              await this.repos.bankodeRepo.updateBalance(bankBal, client)
              break
            }
            case "BankodeToUser": {
              const bankBal = this.bankodeManager.withdraw(amount)
              this.usersManager.updateBalance(to, amount)
              await this.repos.balancesRepo.applyCredit(to, amount, client)
              await this.repos.bankodeRepo.updateBalance(bankBal, client)
              break
            }
            case "AssetPurchase": {
              this.usersManager.updateBalance(from, -amount)
              this.usersManager.addAsset(from, assetId)
              await this.repos.balancesRepo.applyDebit(from, amount, client)
              await this.repos.usersRepo.addAsset(from, assetId, client)
              break
            }
            default:
              throw new Error("Unknown transaction type")
          }
        })
      } else {
        // Fallback to in-memory operations with atomic rollback
        ensureAtomic([
          {
            do: () => {
              switch (type) {
                case "UserToUser":
                  this.usersManager.updateBalance(from, -amount)
                  this.usersManager.updateBalance(to, amount)
                  break
                case "UserToBankode":
                  this.usersManager.updateBalance(from, -amount)
                  this.bankodeManager.deposit(amount)
                  break
                case "BankodeToUser":
                  this.bankodeManager.withdraw(amount)
                  this.usersManager.updateBalance(to, amount)
                  break
                case "AssetPurchase":
                  this.usersManager.updateBalance(from, -amount)
                  this.usersManager.addAsset(from, assetId)
                  break
                default:
                  throw new Error("Unknown transaction type")
              }
            },
            undo: () => {
              switch (type) {
                case "UserToUser":
                  this.usersManager.updateBalance(from, amount)
                  this.usersManager.updateBalance(to, -amount)
                  break
                case "UserToBankode":
                  this.usersManager.updateBalance(from, amount)
                  this.bankodeManager.withdraw(amount)
                  break
                case "BankodeToUser":
                  this.bankodeManager.deposit(amount)
                  this.usersManager.updateBalance(to, -amount)
                  break
                case "AssetPurchase":
                  this.usersManager.updateBalance(from, amount)
                  if (assetId) {
                    this.usersManager.removeAsset(from, assetId)
                  }
                  break
              }
            }
          }
        ])
      }

      this.ledger.log({ id: txId, type, from, to, amount, assetId, description, status: "success" })
      EventVault.record({ eventId: txId, version: "1.0", type, status: "success", from, to, amount, assetId: assetId || null, reason: null })
    } catch (err) {
      // Rollback in-memory state if needed
      try {
        switch (type) {
          case "UserToUser":
            this.usersManager.updateBalance(from, amount)
            this.usersManager.updateBalance(to, -amount)
            break
          case "UserToBankode":
            this.usersManager.updateBalance(from, amount)
            this.bankodeManager.withdraw(amount)
            break
          case "BankodeToUser":
            this.bankodeManager.deposit(amount)
            this.usersManager.updateBalance(to, -amount)
            break
          case "AssetPurchase":
            this.usersManager.updateBalance(from, amount)
            if (assetId) {
              this.usersManager.removeAsset(from, assetId)
            }
            break
        }
      } catch (_) {}
      const txId = id || genUuid()
      this.ledger.log({ id: txId, type, from, to, amount, assetId, description, status: "failed", error: err.message })
      EventVault.record({ eventId: txId, version: "1.0", type, status: "failed", from, to, amount, assetId: assetId || null, reason: err.message })
      
      throw err
    }
  }
}
