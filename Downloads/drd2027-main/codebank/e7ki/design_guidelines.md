# E7ki! Chat Application - Design Guidelines

## Design Approach

**Reference-Based with System Support**
Primary references: WhatsApp, Telegram, Signal - proven messaging interfaces that prioritize readability and efficiency
Supporting system: Material Design principles for component consistency and interaction patterns

## Core Design Principles

1. **Conversation-First**: Every design decision prioritizes clear, readable message threads
2. **Immediate Feedback**: Real-time indicators (typing, sending, delivered) provide constant status awareness
3. **Efficient Interaction**: Minimize taps/clicks - common actions (send, attach, react) always accessible
4. **Privacy-Conscious**: Visual cues reinforce temporary storage (subtle indicators, ephemeral animations)

## Layout System

**Spacing Units**: Use Tailwind spacing of 1, 2, 3, 4, 6, 8, 12, 16 units
- Tight spacing (1-2): Within message bubbles, between reaction emojis
- Standard spacing (4): Between messages, list items
- Generous spacing (8-12): Between major UI sections, padding around containers
- Extra spacing (16): Screen margins, major section breaks

**Screen Structure**:
- Three-panel desktop layout: Sidebar (280px) | Chat List (320px) | Active Conversation (flex-1)
- Mobile: Full-screen transitions between Chat List → Conversation → Voice/Call screens
- All panels: Full viewport height with internal scrolling

## Typography Hierarchy

**Font Stack**: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)

**Hierarchy**:
- H1 (28px/bold): Screen titles, "E7ki!" branding
- H2 (20px/semibold): Chat participant names in header
- H3 (16px/semibold): Contact names in chat list
- Body (15px/regular): Message content - optimal readability
- Small (13px/regular): Timestamps, metadata
- Tiny (11px/medium): Status indicators, secondary labels

**Message-Specific Typography**:
- Message bubbles: 15px body text, 1.4 line-height for comfortable reading
- Sender names in groups: 13px semibold
- All caps for system messages (uppercase transform, 11px, letter-spacing: 0.5px)

## Component Library

### Navigation & Structure

**Sidebar** (Desktop only):
- Fixed 280px width
- Logo/branding at top (48px height)
- Active chat indicator: 3px left border accent
- Bottom: User profile, settings, logout (56px height)

**Chat List**:
- Each item: 72px height for touch targets
- Avatar (48px circle) | Name + Last Message | Timestamp + Badge
- Unread badge: 20px circle, positioned top-right
- Hover state: Subtle background tint (no color specified, but noticeable)
- Active chat: Distinct background, left accent border

**Conversation Header**:
- Height: 64px
- Back button (mobile) | Avatar (40px) | Name + Status | Actions (Call, Info)
- Typing indicator replaces status text dynamically

### Message Components

**Message Bubbles**:
- Max width: 65% of container on desktop, 80% on mobile
- Padding: 12px horizontal, 10px vertical
- Border radius: 16px for first/last in group, 4px for middle messages
- Tail indicator on first message in group (8px triangular shape)
- Sent messages: Align right
- Received messages: Align left with sender avatar (32px) for groups

**Message Types**:

1. **Text Messages**: Plain bubble with text
2. **Media Messages**: 
   - Images: 240px max width, 320px max height, rounded corners matching bubble
   - Files: Icon (32px) + filename + size, 200px width card
   - Voice: Waveform visualization (280px × 48px) + duration + play button
3. **Reactions**: Small emoji bubbles (24px) anchored to bottom-right of message
4. **Reply Context**: Thin bar (2px) + quoted text preview (12px, truncated), 4px margin-top

**System Messages**:
- Centered, 12px text, timestamp format
- Background pill: minimal padding (6px × 12px), rounded full
- Examples: "Alice joined", "Messages are temporary", date separators

### Input & Actions

**Message Input Bar**:
- Height: 56px minimum (auto-expand for multiline)
- Layout: Attach (40px) | Input (flex-1) | Voice (40px) | Send (40px)
- Input field: 16px text, no border, subtle background
- Max height: 120px before scrolling textarea

**Voice Recording Overlay**:
- Full-width bottom sheet, 200px height
- Waveform visualization: Center, 280px × 60px
- Timer: Top-left, 16px semibold
- Controls: Large circular buttons (64px) - Cancel | Stop & Send
- Preview mode: Play + Re-record + Send (48px buttons, horizontal layout)

**Attachment Menu**:
- Grid layout: 2×2 or 2×3 options
- Each option: 72px square, icon (32px) + label (12px)
- Options: Photo, Document, Voice, Video

### Indicators & Feedback

**Typing Indicator**:
- Positioned at bottom of messages, before input
- Animated dots (3 dots, 6px each, pulsing animation)
- Text: "Alice is typing..." (13px italic)

**Message Status** (sent messages only):
- Single checkmark: Sent
- Double checkmark: Delivered
- Read: (Visual treatment TBD - no color specified)
- Icons: 14px, positioned after timestamp

**Online Status**:
- 10px circle indicator on avatar
- Positioned bottom-right of avatar with 1px border

### Modals & Overlays

**New Chat / Group Creation**:
- Centered modal: 480px width, auto height, max 80vh
- Header: Title (18px semibold) + Close (32px)
- Content: Search input + scrollable user list
- Footer: Cancel + Create CTA (48px height buttons)

**Group Info**:
- Full-screen on mobile, 520px drawer on desktop
- Header: Large avatar (80px) + name + member count
- Sections: Members list, Media/Files grid, Settings, Leave Group
- Each section: 16px padding, divider between

**Reaction Picker**:
- Popup: 8 emoji buttons in horizontal row
- Each: 40px tap target, 28px emoji display
- Appears above/below message with 8px offset
- Backdrop: Subtle dim overlay for context

## Interaction Patterns

**Message Actions** (Long press / Right click):
- Popup menu: Reply, React, Copy, Delete, Info
- Each option: 44px height, icon + label

**Pull to Refresh** (Chat list):
- Subtle loading indicator at top
- 60px pull distance to trigger

**Infinite Scroll**:
- Load 50 messages initially
- Load 30 more when scrolling to top
- Smooth scroll to new message when sending

**File Upload**:
- Drag overlay: Full-screen, dashed border visual
- Preview before send: Image thumbnail or file card + caption input
- Progress indicator: Linear bar in message bubble during upload

## Responsive Breakpoints

- Mobile: < 640px (single panel, full-screen transitions)
- Tablet: 640px - 1024px (two panels: List + Conversation)
- Desktop: > 1024px (three panels: Sidebar + List + Conversation)

**Mobile Optimizations**:
- Larger tap targets (minimum 44px)
- Bottom sheet patterns for modals
- Fixed headers with scroll-away behavior for content area
- Swipe gestures: Swipe right to go back, swipe left on message for actions

## Accessibility

- Focus indicators on all interactive elements (2px outline with offset)
- ARIA labels for icon-only buttons
- Keyboard navigation: Tab through messages, Shift+Tab reverse
- Screen reader announcements for new messages, typing indicators
- Minimum contrast ratios maintained throughout (verified in implementation)

## Performance Considerations

- Virtual scrolling for message lists (render only visible + buffer)
- Lazy load images and media thumbnails
- Debounced typing indicators (500ms delay)
- Optimistic UI updates (show sent message immediately, update status async)

---

**Images**: This is a chat application - no hero images or marketing imagery needed. All visual content is user-generated (avatars, shared photos/files). Use placeholder avatars (initials-based, geometric patterns) for contacts without profile pictures.