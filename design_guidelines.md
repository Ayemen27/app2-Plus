# AgentForge AI Agent Management Dashboard - Design Guidelines

## Design Approach
**Reference-Based**: Drawing from Linear's precision, ChatGPT's conversational interface, and Vercel's dashboard minimalism. Modern SaaS aesthetic with focus on both data visualization and natural interaction.

**Dark-First Design**: All layouts optimized for dark mode with light mode as alternative. High contrast for readability in extended sessions.

## Layout Architecture

**Spacing System**: Tailwind units of 2, 4, 6, 8, and 16 for clean, consistent rhythm.

**Desktop-First Structure** (>1024px):
- Left sidebar navigation (w-64, backdrop-blur, semi-transparent)
- Main content area (flex-1, max-w-7xl, px-8)
- Optional right panel for agent chat (w-96, slide-in overlay)

**Tablet/Mobile** (≤1024px):
- Collapsible hamburger sidebar
- Full-width content
- Chat opens as full-screen modal

**Sidebar Components**:
- Logo/brand (h-16, p-4)
- Navigation groups with icons (h-10, hover state with subtle glow)
- Active indicator (left border, 3px width, rounded-r)
- Quick actions section (create agent, settings)
- User profile at bottom (avatar + name + dropdown)

## Typography Hierarchy
**Font**: Inter + JetBrains Mono (code/logs) via Google Fonts CDN
- Page Titles: text-3xl, font-bold, tracking-tight
- Section Headers: text-xl, font-semibold
- Card Titles: text-lg, font-medium
- Body Text: text-base, font-normal
- Labels/Meta: text-sm, font-medium
- Code/Logs: text-sm, font-mono
- Buttons: text-sm, font-semibold, tracking-wide

## Core Dashboard Components

**Agent Grid** (Desktop: 3 columns, Tablet: 2, Mobile: 1):
- Cards: rounded-2xl, p-6, min-h-64, backdrop-blur border
- Header: Agent name (text-lg, font-bold) + type badge (px-3 py-1, rounded-full, text-xs)
- Status indicator: Pulsing dot (w-2 h-2) + text (Active/Idle/Training/Error)
- Real-time metrics section (grid-cols-2, gap-4):
  - Requests handled (large number text-2xl + label text-sm)
  - Response time (ms, with trend arrow)
  - Success rate (percentage with mini progress ring)
  - Last active (timestamp, text-xs)
- Preview of recent activity (3 latest interactions, truncated)
- Action footer: Chat button (primary gradient), Settings (ghost), Stop/Start toggle

**Hero/Dashboard Header**:
- Full-width gradient banner with abstract AI/neural network visualization (h-80)
- Overlay content (absolute positioning, z-10):
  - Welcome message (text-4xl, font-bold)
  - Quick stats row (grid-cols-4): Total agents, Active now, Today's tasks, System health
  - Primary CTA: "Create New Agent" (large button, px-8 py-4, backdrop-blur background)
- Stats cards float slightly above gradient (transform: translateY(-50%))

**Chat Interface** (Right Panel or Modal):
- Header: Agent name + avatar (w-12 h-12, rounded-full) + status dot + close button
- Message area: Full height scroll, pb-24 for input clearance
- Message bubbles:
  - User: right-aligned, max-w-md, rounded-2xl, px-4 py-3
  - Agent: left-aligned, max-w-lg, rounded-2xl, px-4 py-3, avatar on left
- Typing indicator: Three animated dots (w-2 h-2 each)
- Input bar (fixed bottom, backdrop-blur):
  - Textarea (auto-expand, max-h-32, rounded-xl, p-4)
  - Attachment button (paperclip icon, left side)
  - Send button (right side, gradient, rounded-full, w-10 h-10)

**Agent Configuration Panel**:
- Tabbed interface: General, Model, Prompts, Tools, Limits
- Form sections with border-l-2 accent, pl-6 spacing
- Input fields: h-11, rounded-lg, px-4
- Toggle switches for boolean settings (w-11 h-6, rounded-full with sliding dot)
- Dropdown selects with Heroicons chevron
- Code editor area for prompts (min-h-64, font-mono, syntax highlighting placeholder comment)
- Save button (sticky bottom, full-width on mobile, right-aligned on desktop)

**Real-Time Activity Feed**:
- Timeline layout (vertical line on left, dots for events)
- Event cards: rounded-lg, p-4, space-y-2
- Event type icon (w-8 h-8, rounded-full background)
- Event description (text-sm) + timestamp (text-xs)
- Expandable details (click to show full logs)
- Auto-scroll with pause button when user scrolls up
- Filter chips at top (All, Errors, Warnings, Info)

**System Monitoring Dashboard**:
- Chart grid (grid-cols-2, gap-6)
- Performance graphs: Line charts for CPU/Memory over time
- Request volume: Bar chart (last 24 hours, hourly buckets)
- Error rate donut chart with percentage center
- Response time distribution histogram
- All charts: Responsive SVG with tooltips on hover

## Mobile Optimizations

**Bottom Navigation** (Mobile only, h-16, backdrop-blur):
- 4 core tabs: Dashboard, Agents, Chat, Settings
- Icon + label vertical stack
- Active state with top border indicator (h-1)

**Swipe Gestures**:
- Swipe agent cards for quick actions (edit/delete/duplicate)
- Pull-to-refresh on agent list and activity feed
- Swipe between chat conversations

## Icons & Assets
**Heroicons**: Navigation (home, chart-bar, cog), actions (plus, pencil, trash), status (check-circle, exclamation, clock), chat (chat-bubble, paper-airplane)

**Font Awesome**: AI/robot icons (fa-robot), neural network patterns

## Images

**Hero Section**: Abstract AI/neural network visualization - flowing particle connections, gradient mesh, or animated neural pathways. Low opacity overlay allows text readability. Height: h-80 desktop, h-64 mobile.

**Agent Avatars**: Placeholder AI-themed icons/illustrations representing different agent types (analyst, writer, coder, assistant). Circular format, w-12 h-12 in cards, w-16 h-16 in chat.

**Empty States**: 
- No agents: Robot illustration + "Create Your First Agent" CTA
- No messages: Chat bubble illustration + prompt suggestions
- No activity: Flatline graph illustration + "Waiting for events"

**Dashboard Accent**: Subtle grid pattern or dot matrix background for main content area (very low opacity for depth without distraction).

## Special Interactions

**Command Palette** (⌘K trigger):
- Modal overlay (max-w-2xl, rounded-xl, backdrop-blur)
- Search input (text-lg, p-4)
- Results list (keyboard navigable, group by category)
- Actions: Create agent, open chat, view logs, navigate

**Live Status Updates**: WebSocket-powered real-time indicators - pulsing animations, smooth number transitions, toast notifications for critical events.

**Animations**: Subtle scale on card hover (scale-105), fade-in for new messages, slide-in for panels. Keep under 300ms duration. Use sparingly - only for state changes and user feedback.