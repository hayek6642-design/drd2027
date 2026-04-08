# Talent Studio Folder Structure Report

## Overview
The `Talent-Studio` folder is located at `codebank/battalooda/Talent-Studio/` and represents a comprehensive, modern web application built with TypeScript, React, and a monorepo architecture. It serves as a full-featured talent studio platform with API servers, UI components, and development tools.

## Complete Folder Structure (Excluding node-modules)

```
codebank/battalooda/Talent-Studio/
├── .gitignore                         # Git ignore rules (668 chars)
├── .npmrc                             # npm configuration (56 chars)
├── .replit                            # Replit configuration (413 chars)
├── .replitignore                      # Replit ignore rules (201 chars)
├── package.json                       # Root package configuration (585 chars)
├── pnpm-lock.yaml                     # pnpm lock file (214,403 chars)
├── pnpm-workspace.yaml                # pnpm workspace configuration (6,558 chars)
├── replit.md                          # Replit documentation (5,984 chars)
├── .agents/                           # AI agents configuration directory
├── artifacts/                         # Build artifacts and sub-projects
│   ├── api-server/                    # Backend API server
│   │   ├── build.mjs                  # Build script (3,455 chars)
│   │   ├── package.json               # API server package config (860 chars)
│   │   ├── tsconfig.json              # TypeScript configuration (271 chars)
│   │   └── src/                       # Source code
│   │       ├── app.ts                 # Express app setup (656 chars)
│   │       ├── index.ts               # Server entry point (511 chars)
│   │       ├── lib/                   # Library utilities
│   │       │   ├── .gitkeep           # Git placeholder
│   │       │   └── logger.ts          # Logging utility (421 chars)
│   │       ├── middlewares/            # Middleware directory
│   │       │   └── .gitkeep           # Git placeholder
│   │       └── routes/                # API routes
│   │           ├── health.ts          # Health check endpoint (288 chars)
│   │           └── index.ts           # Route aggregator (171 chars)
│   ├── battalooda-studio/             # Main studio frontend application
│   │   ├── components.json            # UI components config (434 chars)
│   │   ├── index.html                 # HTML entry point (796 chars)
│   │   ├── package.json               # Studio package config (2,741 chars)
│   │   ├── tsconfig.json              # TypeScript configuration (520 chars)
│   │   ├── vite.config.ts             # Vite build configuration (1,514 chars)
│   │   ├── public/                    # Static assets
│   │   │   ├── favicon.svg            # Favicon (163 chars)
│   │   │   └── opengraph.jpg          # OpenGraph image (86,401 chars)
│   │   └── src/                       # Source code
│   │       ├── App.tsx                # Main React component (1,164 chars)
│   │       ├── index.css              # Global styles (14,037 chars)
│   │       ├── main.js                # JavaScript entry point (1,217 chars)
│   │       ├── main.tsx               # TypeScript entry point (157 chars)
│   │       ├── components/            # React components
│   │       │   └── ui/                # UI component library
│   │       │       ├── alert-dialog.tsx
│   │       │       ├── aspect-ratio.tsx
│   │       │       ├── avatar.tsx
│   │       │       ├── badge.tsx
│   │       │       ├── breadcrumb.tsx
│   │       │       ├── button-group.tsx
│   │       │       ├── button.tsx
│   │       │       ├── calendar.tsx
│   │       │       ├── card.tsx
│   │       │       ├── carousel.tsx
│   │       │       ├── chart.tsx
│   │       │       ├── checkbox.tsx
│   │       │       ├── collapsible.tsx
│   │       │       ├── command.tsx
│   │       │       ├── context-menu.tsx
│   │       │       ├── dialog.tsx
│   │       │       ├── drawer.tsx
│   │       │       ├── dropdown-menu.tsx
│   │       │       ├── empty.tsx
│   │       │       ├── field.tsx
│   │       │       ├── form.tsx
│   │       │       ├── hover-card.tsx
│   │       │       ├── input-group.tsx
│   │       │       ├── input-otp.tsx
│   │       │       ├── input.tsx
│   │       │       ├── item.tsx
│   │       │       ├── kbd.tsx
│   │       │       ├── label.tsx
│   │       │       ├── menubar.tsx
│   │       │       ├── navigation-menu.tsx
│   │       │       ├── pagination.tsx
│   │       │       ├── popover.tsx
│   │       │       ├── progress.tsx
│   │       │       ├── radio-group.tsx
│   │       │       ├── resizable.tsx
│   │       │       ├── scroll-area.tsx
│   │       │       ├── select.tsx
│   │       │       ├── separator.tsx
│   │       │       ├── sheet.tsx
│   │       │       ├── sidebar.tsx
│   │       │       ├── skeleton.tsx
│   │       │       ├── slider.tsx
│   │       │       ├── sonner.tsx
│   │       │       ├── spinner.tsx
│   │       │       ├── switch.tsx
│   │       │       ├── table.tsx
│   │       │       ├── tabs.tsx
│   │       │       ├── textarea.tsx
│   │       │       ├── toast.tsx
│   │       │       ├── toaster.tsx
│   │       │       ├── toggle-group.tsx
│   │       │       ├── toggle.tsx
│   │       │       └── tooltip.tsx
│   │       ├── engine/                # Studio engine modules
│   │       │   ├── RecordingStore.js  # Recording data management (2,450 chars)
│   │       │   └── StudioEngine.js    # Core studio engine (15,898 chars)
│   │       ├── hooks/                 # React hooks
│   │       │   ├── use-mobile.tsx     # Mobile detection hook (565 chars)
│   │       │   └── use-toast.ts       # Toast notification hook (3,895 chars)
│   │       ├── lib/                   # Utility libraries
│   │       │   └── utils.ts           # Utility functions (166 chars)
│   │       ├── pages/                 # Page components
│   │       │   └── not-found.tsx      # 404 page (711 chars)
│   │       ├── styles/                # Stylesheets
│   │       │   └── studio.css         # Studio-specific styles (30,955 chars)
│   │       └── ui/                    # Custom UI components
│   │           ├── Browser.js         # Browser panel component (5,032 chars)
│   │           ├── ChannelRack.js     # Channel rack component (5,726 chars)
│   │           ├── Effects.js         # Effects panel component (2,167 chars)
│   │           ├── Mixer.js           # Mixer panel component (878 chars)
│   │           ├── Piano.js           # Piano component (5,124 chars)
│   │           ├── Playlist.js        # Playlist component (3,072 chars)
│   │           ├── RecordingsPanel.js # Recordings panel (4,821 chars)
│   │           ├── SaveRecordingModal.js # Save recording modal (5,331 chars)
│   │           ├── StudioUI.js        # Main studio UI (4,434 chars)
│   │           └── Toolbar.js         # Toolbar component (5,269 chars)
│   └── mockup-sandbox/                # Mockup sandbox environment
│       ├── components.json            # UI components config (426 chars)
│       ├── index.html                 # HTML entry point (4,323 chars)
│       ├── mockupPreviewPlugin.ts     # Vite plugin for mockups (4,639 chars)
│       ├── package.json               # Sandbox package config (2,511 chars)
│       ├── tsconfig.json              # TypeScript configuration (449 chars)
│       ├── vite.config.ts             # Vite build configuration (1,615 chars)
│       └── src/                       # Source code
│           ├── App.tsx                # Main React component (3,654 chars)
│           ├── index.css              # Global styles (4,967 chars)
│           ├── main.tsx               # Entry point (157 chars)
│           ├── components/            # React components
│           │   └── ui/                # UI component library (similar to battalooda-studio)
│           ├── hooks/                 # React hooks
│           │   ├── use-mobile.tsx     # Mobile detection hook (565 chars)
│           │   └── use-toast.ts       # Toast notification hook (3,767 chars)
│           └── lib/                   # Utility libraries
│               └── utils.ts           # Utility functions (166 chars)
├── attached_assets/                   # Attached asset files
│   ├── App_1774192799396.css          # App styles (606 chars)
│   ├── App_1774192799400.tsx          # App component (879 chars)
│   ├── audio-engine_1774192831443.js  # Audio engine (11,949 chars)
│   ├── battalooda_1774192855573.html  # Battalooda HTML (14,223 chars)
│   ├── battalooda-core_1774192831449.js # Battalooda core (33,493 chars)
│   ├── battalooda-core_1774192855560.js # Battalooda core alt (6,333 chars)
│   ├── BattaloodaStudio_1774192799402.tsx # Studio component (3,531 chars)
│   ├── BrowserPanel_1774192799403.tsx # Browser panel (4,230 chars)
│   ├── ChannelRack_1774192799404.tsx  # Channel rack (6,249 chars)
│   ├── EffectsPanel_1774192799406.tsx # Effects panel (3,104 chars)
│   ├── index_1774192799408.css        # Index styles (2,516 chars)
│   ├── Index_1774192799410.tsx        # Index component (139 chars)
│   ├── MixerPanel_1774192799413.tsx   # Mixer panel (3,969 chars)
│   ├── music-library_1774192831450.js # Music library (15,068 chars)
│   ├── PlaylistView_1774192799417.tsx # Playlist view (4,647 chars)
│   ├── social-features_1774192831453.js # Social features (14,893 chars)
│   ├── studio-engine_1774192818058.js # Studio engine (9,655 chars)
│   ├── studio-ui_1774192818040.js     # Studio UI (15,589 chars)
│   └── useStudioEngine_1774192799417.ts # Studio engine hook (10,569 chars)
├── lib/                               # Shared libraries
│   ├── api-client-react/              # React API client
│   │   ├── package.json               # Package config (265 chars)
│   │   ├── tsconfig.json              # TypeScript config (251 chars)
│   │   └── src/                       # Source code
│   │       ├── custom-fetch.ts        # Custom fetch implementation (11,211 chars)
│   │       ├── index.ts               # Entry point (194 chars)
│   │       └── generated/             # Generated code
│   │           ├── api.schemas.ts     # API schemas (176 chars)
│   │           └── api.ts             # API client (2,542 chars)
│   ├── api-spec/                      # API specification
│   │   ├── openapi.yaml               # OpenAPI spec (778 chars)
│   │   ├── orval.config.ts            # Orval configuration (1,698 chars)
│   │   └── package.json               # Package config (197 chars)
│   ├── api-zod/                       # Zod validation
│   │   ├── package.json               # Package config (189 chars)
│   │   ├── tsconfig.json              # TypeScript config (221 chars)
│   │   └── src/                       # Source code
│   │       ├── index.ts               # Entry point (68 chars)
│   │       └── generated/             # Generated code
│   │           ├── api.ts             # API types (294 chars)
│   │           └── types/             # Type definitions
│   │               ├── healthStatus.ts # Health status type (177 chars)
│   │               └── index.ts       # Type exports (157 chars)
│   └── db/                            # Database library
│       ├── drizzle.config.ts          # Drizzle ORM config (352 chars)
│       ├── package.json               # Package config (577 chars)
│       ├── tsconfig.json              # TypeScript config (244 chars)
│       └── src/                       # Source code
│           ├── index.ts               # Entry point (416 chars)
│           └── schema/                # Database schemas
│               └── index.ts           # Schema definitions (743 chars)
└── scripts/                           # Build/dev scripts
    └── package.json                   # Scripts package config (281 chars)
```

## Directory Breakdown

### 1. Root Configuration Files
- **.gitignore**: Git ignore rules for the project
- **.npmrc**: npm package manager configuration
- **.replit**: Replit cloud IDE configuration
- **.replitignore**: Replit-specific ignore rules
- **package.json**: Root package.json for monorepo
- **pnpm-lock.yaml**: pnpm dependency lock file
- **pnpm-workspace.yaml**: pnpm workspace configuration for monorepo
- **replit.md**: Replit documentation and setup instructions

### 2. `.agents/` Directory
AI agents configuration directory (contents not fully explored)

### 3. `artifacts/` Directory
Contains three main sub-projects:

#### 3.1 `api-server/`
Backend API server built with TypeScript:
- **build.mjs**: Build script for the API server
- **package.json**: Dependencies and scripts
- **tsconfig.json**: TypeScript configuration
- **src/**: Source code directory
  - `app.ts`: Express application setup
  - `index.ts`: Server entry point
  - `lib/logger.ts`: Logging utility
  - `routes/health.ts`: Health check endpoint
  - `routes/index.ts`: Route aggregator

#### 3.2 `battalooda-studio/`
Main frontend studio application:
- **Configuration**: components.json, package.json, tsconfig.json, vite.config.ts
- **public/**: Static assets (favicon, OpenGraph image)
- **src/**: Source code
  - `App.tsx`: Main React component
  - `index.css`: Global styles (14KB)
  - `main.js`/`main.tsx`: Entry points
  - **components/ui/**: Comprehensive UI component library (40+ components)
  - **engine/**: Studio engine modules (RecordingStore, StudioEngine)
  - **hooks/**: React hooks (use-mobile, use-toast)
  - **lib/utils.ts**: Utility functions
  - **pages/not-found.tsx**: 404 page
  - **styles/studio.css**: Studio-specific styles (31KB)
  - **ui/**: Custom studio UI components (Browser, ChannelRack, Effects, Mixer, Piano, Playlist, RecordingsPanel, SaveRecordingModal, StudioUI, Toolbar)

#### 3.3 `mockup-sandbox/`
Mockup sandbox environment for testing:
- **Configuration**: components.json, package.json, tsconfig.json, vite.config.ts
- **mockupPreviewPlugin.ts**: Custom Vite plugin for mockup previews
- **src/**: Source code (similar structure to battalooda-studio)

### 4. `attached_assets/`
Contains attached asset files with timestamps:
- CSS stylesheets
- TypeScript/React components
- JavaScript modules
- HTML files
- All files include timestamps in their names (e.g., `_1774192799396`)

### 5. `lib/` Directory
Shared libraries and utilities:

#### 5.1 `api-client-react/`
React API client library:
- Custom fetch implementation
- Generated API client and schemas

#### 5.2 `api-spec/`
API specification:
- OpenAPI YAML specification
- Orval configuration for code generation

#### 5.3 `api-zod/`
Zod validation library:
- Generated API types
- Health status type definitions

#### 5.4 `db/`
Database library:
- Drizzle ORM configuration
- Database schema definitions

### 6. `scripts/` Directory
Build and development scripts

## Architecture Summary

The Talent Studio follows a modern monorepo architecture with:

1. **Monorepo Management**: pnpm workspaces for dependency management
2. **Frontend**: React + TypeScript + Vite
3. **Backend**: TypeScript + Express
4. **Database**: Drizzle ORM
5. **API**: OpenAPI specification with code generation
6. **Validation**: Zod for type-safe validation
7. **UI Components**: Comprehensive component library (shadcn/ui style)
8. **Build Tools**: Vite for frontend, custom build scripts for backend

## Key Features

- **Studio Environment**: Full-featured audio studio with mixer, effects, piano, playlist
- **Recording System**: Recording management and storage
- **Channel Rack**: Audio channel management
- **Browser Panel**: File and asset browsing
- **API Server**: RESTful API with health checks
- **Mockup Sandbox**: Testing environment for UI mockups
- **Type Safety**: Full TypeScript implementation
- **Modern UI**: Comprehensive component library

## Technology Stack

- **Language**: TypeScript, JavaScript
- **Frontend**: React, Vite, CSS
- **Backend**: Node.js, Express
- **Database**: Drizzle ORM (PostgreSQL compatible)
- **Package Manager**: pnpm
- **API**: OpenAPI, Orval, Zod
- **Cloud**: Replit compatible

## Notes

- The project uses pnpm workspaces for monorepo management
- Attached assets appear to be exported/generated files with timestamps
- The UI component library is extensive (40+ components)
- The studio engine is feature-rich with recording, mixing, and effects capabilities
- API specification suggests a well-documented backend
- The mockup sandbox provides a safe environment for UI experimentation
