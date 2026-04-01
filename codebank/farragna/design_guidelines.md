# Farragna Design Guidelines

## Design Approach: Reference-Based (Social Media)

**Primary References:** TikTok (vertical video feed), Instagram (engagement patterns), YouTube (content organization)

**Key Principles:**
- Immersive full-screen video experience
- Gesture-based navigation (swipe/scroll)
- Prominent engagement mechanics
- Clear content moderation workflow
- Streamlined upload process with legal clarity

---

## Typography System

**Font Stack:**
- Primary: System fonts for optimal performance (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- Fallback: Open Sans via CDN for consistency

**Hierarchy:**
- **Hero/Brand:** 2xl-3xl, bold (700) - Farragna logo, main headings
- **Section Headers:** xl-2xl, semibold (600) - Dashboard titles, category headers
- **Body/Captions:** base-lg, medium (500) - Video captions, descriptions
- **Metadata:** sm-xs, regular (400) - View counts, timestamps, category tags
- **Legal/Fine Print:** xs, regular (400) - Consent text, disclaimers

**Letter Spacing:** Tight (-0.02em) for headers, normal for body

---

## Layout System

**Spacing Primitives:** Use Tailwind units: **2, 4, 8, 12, 16, 20** for consistent rhythm
- Micro spacing: `p-2, gap-2` (buttons, icons)
- Component padding: `p-4, p-8` (cards, modals)
- Section spacing: `py-12, py-16, py-20` (between major UI sections)

**Grid Systems:**
- Video Feed: Full viewport height (100vh), snap-scroll vertical
- Category Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` with `gap-4`
- Admin Dashboard: Two-column stat cards `grid-cols-4 gap-3`

**Containers:**
- Full-width video player: `w-full h-full`
- Modal content: `max-w-md sm:max-w-lg`
- Header: Fixed, `h-20` with `px-5`

---

## Component Library

### Navigation & Header
**Fixed Header (h-20):**
- Left: Farragna logo with gradient effect, click counter for admin access
- Center: Search bar with expand/collapse (hidden until toggled)
- Right: Upload button, Favorites icon, Theme toggle, User avatar dropdown

**Search:** Expandable input with clear button, submit on Enter or button click

### Video Player (Core Experience)
**Full-Screen Player:**
- Video fills entire viewport (`object-cover`)
- Overlay gradient at bottom (black/80 to transparent) for caption readability
- Caption: Left-bottom, white text with shadow/blur background
- Controls: Left-side vertical stack (play/pause, mute, fullscreen) - appear on hover
- Progress bar: Thin horizontal strip at bottom, clickable for seeking
- Watermark: Bottom-right corner, "Farragna | Protected" with shield icon

**Engagement Sidebar (Right-side):**
- Vertical stack of circular buttons (w-12 h-12) with icons
- Three-tier system: Heart (like), Flame (super like), Crown (mega like)
- Count displays below each button
- Additional: Comment, Share icons
- Spacing: `gap-5` between buttons
- Backdrop blur on button backgrounds (`bg-black/40 backdrop-blur-sm`)

**Navigation Indicators:**
- Chevron buttons: Top/bottom center for previous/next video
- Dot indicators: Right edge showing current position in feed

### Upload Modal
**Multi-Step Consent Flow:**
- Drag-and-drop zone with file upload (border-dashed, hover states)
- File preview with size display and remove option
- Caption input field
- Category dropdown select
- **Two consent checkboxes** (prominently displayed in bg-muted/50 container):
  1. "I take full responsibility for content"
  2. "I grant YouTube publishing rights and monetization"
- Progress bar during upload
- Clear visual hierarchy: Upload zone → Metadata → Consent → Action buttons

### Admin Dashboard
**Authentication Screen:**
- Centered password input with shield icon
- Clean, minimal design
- Error message display

**Dashboard View:**
- Four stat cards: Total, Approved, Review, Rejected (colored borders)
- Search + Filter controls in horizontal layout
- Scrollable video list with thumbnail previews
- Action buttons per video: Approve (green), Reject (yellow), Delete (red)
- Three-state badge system for moderation status

### Category Grid
**Card Design:**
- Aspect ratio: 16:9 (`aspect-video`)
- Thumbnail with overlay gradient
- Category name: Bottom-left, white bold text
- Video count badge: Top-right corner
- Hover: Scale transform (1.05), play icon overlay appears

### Favorites Modal
**List View:**
- Horizontal cards with thumbnail, title, metadata
- Play button on thumbnail hover
- Remove button (trash icon) on right
- Empty state: Heart icon with message

---

## Animations & Interactions

**Minimal Animation Philosophy:** Subtle, purposeful motion only

**Permitted Animations:**
- Engagement buttons: Pulse on click, count pop-up
- Video transitions: Smooth scroll snap between videos
- Modal: Fade in/out with slight scale
- Hover states: Transform scale (1.05-1.1), opacity changes
- Loading: Spinner for upload progress, video buffering

**Forbidden:**
- Excessive scroll-triggered animations
- Parallax effects
- Auto-playing decorative animations
- Distracting background motion

---

## Color Direction Note

Per user request: **Orange and violet** color scheme to be implemented for primary/accent colors throughout the platform. Detailed color values will be defined in the CSS variables system, maintaining the existing structure for light/dark theme support.

---

## Images

**Profile/User Images:**
- Avatar circles in header dropdown
- Thumbnail previews in admin dashboard and favorites

**Video Thumbnails:**
- Auto-generated from uploaded videos or user-provided
- Category grid featured images
- Admin moderation preview images

**Icons:**
- Use **Lucide React** icon library (already in codebase)
- Consistent 20-24px size for UI actions
- 32-40px for empty states and large actions