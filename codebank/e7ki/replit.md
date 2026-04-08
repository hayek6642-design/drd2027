# E7ki! - Privacy-Focused Messaging Platform

## Overview

E7ki! is a secure, privacy-first messaging application similar to WhatsApp, Messenger, and Signal. The platform emphasizes temporary message storage with automatic deletion, supporting text messages, voice recordings, images, videos, and file sharing. Unlike traditional messaging apps, E7ki! does not require phone numbers - only email addresses for authentication.

**Core Philosophy**: Messages are stored temporarily in the browser using IndexedDB and are automatically deleted after being read or after a configurable time-to-live (TTL) period. Files have a 5-minute download window before automatic deletion.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript, built using Vite as the build tool and development server.

**UI Component System**: 
- shadcn/ui component library (New York style variant) with Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Design inspired by WhatsApp, Telegram, and Signal interfaces
- Responsive layout: Three-panel desktop (Sidebar | Chat List | Conversation), full-screen mobile transitions

**State Management**:
- React Context API for global chat state (`ChatContext`, `WebSocketContext`, `ThemeProvider`)
- TanStack Query (React Query) for server state management
- Local-first architecture with IndexedDB as primary data store

**Routing**: Wouter for lightweight client-side routing

**Real-time Communication**: WebSocket connection for instant message delivery, typing indicators, presence status, and reactions

**Type Safety**: Full TypeScript implementation with shared schema definitions between client and server

### Backend Architecture

**Server Framework**: Express.js with TypeScript, serving both API endpoints and static assets

**WebSocket Server**: ws library for real-time bidirectional communication
- Maintains persistent connections for each authenticated user
- Broadcasts messages, typing indicators, and presence updates
- Automatic reconnection with exponential backoff

**Session Management**: In-memory session store using MemStorage class
- User data stored transiently on server
- Email-based authentication (no phone numbers)
- Session-based user identification

**Build System**: 
- Vite for client bundling with React plugin
- esbuild for server bundling with selective dependency bundling
- Custom build script (`script/build.ts`) for production deployment

### Data Storage Solutions

**Primary Storage - IndexedDB (Client-side)**:
- Three object stores: `messages`, `chats`, `files`
- Indexed by: `chatId`, `timestamp`, `expiresAt`
- Automatic cleanup using TTL-based expiration
- Background cleanup interval runs continuously

**Message TTL Strategy**:
- Text messages: Deleted immediately after being read by recipient
- Downloadable files (images, videos, PDFs, voice): 5-minute retention window
- Each message has `expiresAt` timestamp for automatic cleanup
- Service Workers and caching strategies for performance optimization

**Server Storage**: 
- In-memory only (MemStorage class)
- No persistent database on server side
- User registry maintained during runtime only

### Authentication and Authorization

**Authentication Method**:
- Email-based authentication (explicitly no phone numbers)
- Session-based authentication using express-session
- User sessions tracked via WebSocket connection initialization

**Authorization Pattern**:
- User ID passed during WebSocket handshake
- Message sender verification on server before broadcast
- Client-side validation of message ownership for deletion/editing

### External Dependencies

**Third-party UI Libraries**:
- Radix UI: Accessible component primitives (dialogs, dropdowns, popovers, tooltips, etc.)
- Tailwind CSS: Utility-first styling framework
- Lucide React: Icon library
- date-fns: Date formatting and manipulation
- class-variance-authority & clsx: Dynamic className management

**Build and Development Tools**:
- Vite: Frontend build tool and dev server
- esbuild: Server-side bundling
- tsx: TypeScript execution for development
- PostCSS with Autoprefixer: CSS processing

**Real-time Communication**:
- ws (WebSocket): Server-side WebSocket implementation
- Native WebSocket API (browser): Client-side real-time connection

**Media Handling**:
- Web Audio API: Voice message recording and playback
- MediaRecorder API: Audio/video capture
- Canvas API: Waveform visualization for voice messages
- Blob API: File handling and storage

**Database**:
- Drizzle ORM: SQL query builder (configured for PostgreSQL)
- drizzle-kit: Schema migrations and management
- Note: Current implementation uses IndexedDB for client storage; Drizzle/PostgreSQL configured but not actively used

**Form Management**:
- React Hook Form: Form state and validation
- Zod: Schema validation
- @hookform/resolvers: Zod integration with React Hook Form

**Additional Libraries**:
- TanStack React Query: Server state synchronization
- embla-carousel-react: Carousel/slider component
- Wouter: Lightweight routing
- cmdk: Command palette component (for search/quick actions)

**Development Environment**:
- Replit-specific plugins: Runtime error modal, cartographer, dev banner
- TypeScript: Full type safety across codebase
- ESM modules throughout (type: "module" in package.json)