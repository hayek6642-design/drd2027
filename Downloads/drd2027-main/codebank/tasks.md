You are a senior systems engineer responsible for restructuring an existing production-like JavaScript web project.
Your task is to implement a **safe, incremental architecture upgrade** without breaking the existing runtime behavior.

The project currently contains:

Main components:

* yt-new-clear.html (main UI)
* yt-player.js (video player and reward engine trigger)
* safe-asset-list.js (core asset ledger and code storage)
* safe-code-bridge.js (UI bridge for codes)
* watch-dog-guardian.js (system integrity authority)
* codebank/indexCB.html (service hub with iframe tabs)
* multiple services (samma3ny, farragna, e7ki, safecode, etc.)
* SQLite database
* mobile-app style UI icons planned

CRITICAL SYSTEM AUTHORITIES (must NOT be broken):

1. yt-player.js → safe-asset-list.js relationship
   yt-player generates reward events that eventually produce codes stored by safe-asset-list.js.

2. watch-dog-guardian.js is the final authority
   All ledger verification must continue to pass through it.

3. postMessage bridge between services and the core system must remain functional.

4. Mobile icon UI CSS must remain compatible.

5. No code generation logic may bypass the asset ledger.

Your task is to implement the following phases safely.

Do NOT remove existing working logic.
Only refactor gradually and keep backward compatibility.

---

PHASE 1 — SERVICE MANAGER (LAZY LOADING SERVICES)

Goal:
Replace the current "load all iframe tabs" approach with a lazy-loaded service architecture.

Create:

/js/service-manager.js

Architecture:

* Manage service lifecycle
* Lazy-load iframe services
* Maintain postMessage bridge
* Allow unmounting services
* Preserve state if needed

Service registry example:

serviceRegistry = {
samma3ny: { url: './services/samma3ny/index.html', preload: false },
farragna: { url: './services/farragna/index.html', preload: false },
e7ki: { url: './services/e7ki/index.html', preload: false },
safecode: { url: './services/safecode/index.html', preload: true }
}

Rules:

* Only one service iframe active at a time
* Services loaded only when user clicks icon
* Existing service communication must still use postMessage
* safe-asset-list.js must still receive events from services

Integrate with:

codebank/indexCB.html

Instead of tab iframes, call:

serviceManager.mount(serviceId, container)

Mobile icon UI must trigger these mounts.

---

PHASE 2 — SQLITE WAL MODE + TRANSACTION QUEUE

Goal:
Improve write performance and prevent database locking.

Create:

/database/sqlite/connection.js

Requirements:

Enable WAL mode:

PRAGMA journal_mode=WAL
PRAGMA synchronous=NORMAL
PRAGMA cache_size=-64000

Implement:

SQLiteWALAdapter

Features:

* write queue
* batch transactions
* flush interval (50ms)
* batch size (100 operations)

Pseudo workflow:

generateCode()
↓
queueWrite()
↓
transaction batch
↓
SQLite
↓
notify watch-dog

IMPORTANT:

After every batch write emit:

window.dispatchEvent(
new CustomEvent('sqlite:batch-flush')
)

watch-dog-guardian.js must listen to this event.

Do NOT modify existing code generation logic yet.
Only route database writes through the queue.

---

PHASE 3 — VITE BUILD SYSTEM

Goal:
Reduce JS payload and enable code splitting.

Create:

vite.config.js

Bundling strategy:

core bundle:

* yt-player.js
* safe-asset-list.js
* safe-code-bridge.js
* watch-dog-guardian.js

service bundles:

* samma3ny
* farragna
* e7ki
* safecode

UI bundle:

* service-manager.js
* UI components

Rules:

* Use ES Modules
* Preserve global variables required by legacy code
* Do not break browser execution without build step

Add npm scripts:

dev
build
preview

---

PHASE 4 — ADMIN PULSE DASHBOARD

Create:

/admin/pulse-dashboard.html

Purpose:
System observability.

Display:

* total generated codes
* total redeemed codes
* SQLite transaction queue depth
* service health
* watchdog alerts

Use Chart.js.

Data source:

safe-asset-list.js
watch-dog-guardian.js
SQLite adapter metrics.

---

PROJECT STRUCTURE TARGET

/project
yt-new-clear.html
yt-player.js

/core
safe-asset-list.js
safe-code-bridge.js
watch-dog-guardian.js

/system
service-manager.js
utils.js

/services
samma3ny
farragna
e7ki
safecode
...and the other services
/database
/sqlite
connection.js

/admin
pulse-dashboard.html

vite.config.js

---

SAFETY RULES

Do NOT:

* break yt-player reward triggers
* bypass safe-asset-list ledger
* bypass watch-dog validation
* remove postMessage communication

Every modification must keep the current system operational.

Start with Phase 1 only.

After Phase 1 is stable, proceed sequentially.

Before modifying any file:
explain the change and its impact.

Never refactor more than 3 core files at once.

---

FINAL GOAL

Achieve:

* 70% memory reduction (lazy services)
* 5–10x SQLite write performance
* modular service architecture
* maintain existing reward/code logic
* preserve watchdog authority
