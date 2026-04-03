/**
 * App Lifecycle Manager - Production Level System
 * Handles module registration, dependency resolution, and system safety.
 */

class AppLifecycle {
  constructor() {
    if (window.__APP_LIFECYCLE__) {
      return window.__APP_LIFECYCLE__
    }

    this.modules = new Map()
    this.initialized = false
    this.started = false

    window.__APP_LIFECYCLE__ = this
    this._setupGlobalDebug()
  }

  /**
   * Register a module with its dependencies
   * @param {string} name 
   * @param {object} module 
   * @param {string[]} deps 
   */
  register(name, module, deps = []) {
    if (this.modules.has(name)) {
      console.warn(`[Lifecycle] Module ${name} already registered`)
      return
    }

    this.modules.set(name, {
      ...module,
      deps,
      initialized: false,
      started: false
    })
  }

  async init() {
    if (this.initialized) {
      console.warn("[Lifecycle] Already initialized")
      return
    }

    if (window.DEBUG_MODE) console.log("🚀 [Lifecycle] Initializing...")

    for (const [name, mod] of this.modules) {
      if (mod.init && !mod.initialized) {
        if (window.DEBUG_MODE) console.log(`⚙️ init → ${name}`)
        await mod.init()
        mod.initialized = true
      }
    }

    this.initialized = true
  }

  /**
   * Start modules respecting their dependencies
   */
  async start() {
    if (this.started) return

    let allStarted = true
    for (const [name, mod] of this.modules) {
      // Check dependencies
      for (const dep of mod.deps || []) {
        const depModule = this.modules.get(dep)
        if (!depModule?.started) {
          if (window.DEBUG_MODE) console.log(`⏳ waiting ${dep} before starting ${name}`)
          allStarted = false
          break
        }
      }

      if (allStarted && mod.start && !mod.started) {
        if (window.DEBUG_MODE) console.log(`▶️ start → ${name}`)
        await mod.start()
        mod.started = true
        // After starting a module, restart loop to check if other modules can now start
        return this.start()
      }
      
      // If any dependency wasn't met, reset and continue checking others
      if (!allStarted) {
        allStarted = true
        continue
      }
    }

    this.started = true
    if (window.DEBUG_MODE) console.log("✅ [Lifecycle] All modules started")
  }

  /**
   * Internal debug helper
   */
  _setupGlobalDebug() {
    window.__APP_DEBUG__ = () => {
      console.table([...this.modules.entries()].map(([name, mod]) => ({
        name,
        initialized: mod.initialized,
        started: mod.started,
        deps: mod.deps?.join(', ') || 'none'
      })))
    }
  }
}

// 🛡️ Global Utilities (From actly.md)

window.__EVENTS__ = {}

/**
 * Ensures an event handler is only registered once
 */
export function onceEvent(name, handler) {
  if (window.__EVENTS__[name]) return
  window.__EVENTS__[name] = true
  window.addEventListener(name, handler)
}

const pendingRequests = new Map()

/**
 * Prevents API flood by de-duplicating pending requests to the same URL
 */
export async function safeFetch(url, options = {}) {
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url)
  }

  const promise = fetch(url, options).finally(() => {
    pendingRequests.delete(url)
  })

  pendingRequests.set(url, promise)
  return promise
}

/**
 * Controlled reload that doesn't trigger loop guards
 */
window.safeReload = () => {
  console.warn("🔁 Controlled reload triggered")
  window.location.href = window.location.href
}

export const AppLifecycleManager = new AppLifecycle()
