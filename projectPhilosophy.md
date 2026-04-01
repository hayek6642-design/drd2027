Project Report / Contract for IDE

Project Name: Web-v1 / YT-Clear Integration Suite

Prepared for: Any IDE / Developer

1️⃣ Project Vision and Philosophy

Vision: Build a fully modular, local-first, self-sufficient web ecosystem for interactive YouTube embed applications, rewards management, and asset tracking.

Philosophy:

Local-First Development: All features should work offline / local storage before integrating with remote DBs.

Modular Architecture: Every component (player, ledger, switch, self-test) is self-contained and importable.

No Guesswork: Every module has a clear role; developers must rely on existing logic, not invent new behaviors.

Transparency: All logs, transactions, and test results are observable in real-time.

Scalable & Future-Proof: Code should allow easy integration with NeonDB, multiple broadcast channels, and CodeBank services.

2️⃣ Core Functionalities

YouTube Broadcast Player

Embeds YouTube videos and plays them according to a broadcast schedule.

Supports responsive layout and 3-way toggle switching for different playback modes.

Interacts with SelfTest to validate playback schedules.

Ledger / CodeBank

Tracks rewarded assets for each user action.

Uses native localStorage first; later integrates with Neon DB.

Ensures 100% synchronization between generated rewards and stored assets.

SelfTest Module

Local automated testing tool.

Validates broadcast schedule, ledger consistency, and player load.

Reports results to console or HTML div.

3-Way Switch / Player Controls

Provides flexible player control (pause/play/switch).

Modularized for reuse in multiple pages or projects.

Integration Layer

Modular imports via ES6 import/export.

Ensures all components communicate cleanly without tight coupling.

3️⃣ Tools, Libraries, and Dependencies

Frontend: Vanilla JS + ES6 modules, HTML5, CSS3

CSS Libraries: Responsive player styling, FontAwesome for icons

JS Libraries:

html2canvas for DOM snapshot capture

@capacitor/core (optional, for app integration)

Storage: Native localStorage via StorageLord wrapper

Database: Planned integration with NeonDB

Testing: selftest.js module for automated validation

4️⃣ Folder Structure and Key Files
yt-clear/
│
├─ yt-player/                  # Main YouTube player module
│   └─ yt-player.js
├─ 3way-switch-b/              # 3-way toggle control
│   └─ toggle-switch-3way.js
├─ shared/                     # Shared utilities
│   └─ storage-lord.js
├─ codebank/                   # Ledger / asset tracking
│   ├─ js/
│   │   ├─ app.js
│   │   └─ asset-sync.js
├─ styles/                     # CSS / responsive styling
│   ├─ style.css
│   └─ youtube-embed-responsive.css
├─ yt-new.html                 # Main testing page (modularized version)
└─ selftest.js                 # Automated validation module

5️⃣ Project Logic & Data Flow

Broadcast Flow:
Broadcast Schedule → YT Player → Display Video → SelfTest Validation

Ledger Flow:
YT Player / Rewards → CodeBank Asset Sync → Local Storage → SelfTest Validation

SelfTest Flow:

Runs automated checks for schedule accuracy, player load, and ledger consistency

Logs results in console / HTML div

Ensures all new changes do not break existing functionalities

Component Interaction Rules:

YT Player should never write directly to CodeBank; must use asset-sync.js

SelfTest must not modify any production data

All imports must be relative to yt-clear folder to maintain modularity

6️⃣ Guidelines for Any Developer / IDE

Do not invent new logic – follow existing functions, methods, and modularized workflows.

Always work locally first – verify localStorage writes, asset sync, and player schedules.

Index the project mentally before starting tasks: know where each module is, what it does, and its dependencies.

Check imports – ES6 modules must be properly linked; broken links break the whole workflow.

Report errors clearly with exact file, line, and error message.

Document changes – all modifications must be traceable in a log or comment block.

7️⃣ Expected Deliverables / Outcome

Fully functional local testing environment

Modularized Broadcast, Ledger, and SelfTest features

100% asset synchronization

Accurate broadcast schedules validated by SelfTest

Clean console logs, no broken imports, no localStorage errors