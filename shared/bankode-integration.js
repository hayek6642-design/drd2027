// ===============================
// 🏦 BANKODE CORE - Zagel Integration
// ===============================

import { sessionManager } from './session-manager.js'
import { AuthDebugger } from './auth-debug.js'

export class BankodeCoreZagel {
  static initialize() {
    console.log('[BankodeCore] Initializing with Zagel...')
    
    // Subscribe to session changes
    sessionManager.on('session:upgraded', (session) => {
      AuthDebugger.log('bankode:session_upgraded', {
        userId: session.userId,
        type: session.type
      })
      
      // Trigger Zagel welcome
      this.triggerZagelWelcome(session.userId)
    })
    
    // Subscribe to logout
    sessionManager.on('session:logout', () => {
      AuthDebugger.log('bankode:logged_out')
      this.triggerZagelGoodbye()
    })
    
    return sessionManager.getSession()
  }

  static triggerZagelWelcome(userId) {
    if (window.Zagel) {
      window.Zagel.command(`اهلا وسهلا ${userId}! تبي تعرف رصيدك؟`)
    }
  }

  static triggerZagelGoodbye() {
    if (window.Zagel) {
      window.Zagel.command("باي يا بطل! اشوفك قريب 😄")
    }
  }

  static onLogin(userId, userData) {
    sessionManager.upgradeToUser(userId, userData)
  }

  static onLogout() {
    sessionManager.logout()
  }

  static getSession() {
    return sessionManager.getSession()
  }
}
