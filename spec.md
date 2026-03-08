# ARIA Assistant — Phase 5

## Current State

The app is a full-stack AI assistant built on ICP (Motoko + React). Key features already in place:

- **Authentication** via Internet Identity, with user profile (username + email)
- **Chat interface** with text and voice note recording, TTS per message and auto-speak toggle
- **Melina personality engine** (frontend) with intent detection: distress override, name learning, memory recall, reminders, tasks, habits, factual queries, greetings, compliments, general fallback
- **Sidebar with 7 tabs**: Dashboard (stats), Stats (analytics heatmap + topic clusters), Profile (tone/name/notifications), Reminders (CRUD), Habits (streak tracker), Memory (CRUD), Integrations (6 device toggles)
- **Command palette** (Ctrl+K) with 6 quick actions
- **Full-screen avatar overlay** (Esc to close)
- **Mobile layout**: bottom nav + sheet sidebar
- **Auto-TTS** toggle persisted in localStorage
- **Backend** stores: chat history, user profiles, memory entries, reminders, notifications, integration status, assistant settings, activity stats

## Requested Changes (Diff)

### Add

1. **Schedule Planner tab** — new "Schedule" tab in the sidebar between Reminders and Habits:
   - Daily timeline view with hourly time slots (00:00–23:00)
   - Each slot can have one or more scheduled items
   - Add schedule event: title, date, start time, end time, optional note/category
   - Auto-populate from existing reminders (reminders with dueTime appear in the timeline)
   - Color-coded categories: Work, Personal, Health, Learning, Other
   - Today's current time indicator line on the timeline
   - Melina chat intent: "what's on my schedule", "add to schedule", "my day", "schedule for today"

2. **Proactive Insights panel** — new "Insights" tab in the sidebar (after Stats):
   - Melina-generated smart suggestions based on habit streaks and patterns
   - Types of insights: streak warnings (habit at risk), productivity tips, break reminders, schedule gaps
   - Each insight card has: icon, title, body text, action button (e.g. "Check Habits", "Open Schedule")
   - Insights auto-refresh on tab open
   - Melina also injects 1 proactive insight per session into chat (if user has habits or reminders)
   - Chat intent: "any insights", "what should I do", "suggestions", "advice", "tips"

3. **Theme toggle** — accessible from Settings sheet and navbar:
   - Three themes: **Dark (default)** — current cyan/dark HUD, **Light** — clean white with cyan accents, **Melina Red** — dark red/crimson theme matching Melina's outfit
   - Theme persisted in localStorage (`aria_theme`)
   - CSS variables swap via `data-theme` attribute on `<html>`
   - Theme selector shown as three clickable swatches in SettingsSheet

### Modify

- **SidebarTabs**: Add "Schedule" tab (between Reminders and Habits) and "Insights" tab (between Stats and Profile) — now 9 tabs total
- **Mobile bottom nav**: add Schedule shortcut (replace or extend existing 5-tab nav)
- **Melina engine**: add intent handlers for schedule queries and insight requests
- **Backend**: add `ScheduleEvent` type and CRUD methods for schedule events (`createScheduleEvent`, `getScheduleEvents`, `deleteScheduleEvent`, `updateScheduleEvent`)
- **ChatPage**: inject proactive insight message once per session if habits or reminders exist
- **SettingsSheet**: add theme swatches section
- **index.css**: add Light and Melina Red theme CSS variable sets under `[data-theme="light"]` and `[data-theme="red"]`

### Remove

- Nothing removed

## Implementation Plan

1. **Backend** — Add `ScheduleEvent` type (id, title, note, category, startTime, endTime, date as Text) and CRUD methods; expose via `backend.d.ts`
2. **index.css** — Add `[data-theme="light"]` and `[data-theme="red"]` CSS variable overrides alongside existing dark default
3. **useTheme hook** — new `src/hooks/useTheme.ts` that reads/writes `aria_theme` in localStorage and applies `data-theme` to `document.documentElement`
4. **SchedulePlanner component** — new `src/components/SchedulePlanner.tsx` with daily timeline, hour slots, event CRUD, reminder overlay, current time indicator
5. **InsightsPanel component** — new `src/components/InsightsPanel.tsx` with smart suggestion cards derived from habit/reminder data
6. **SidebarTabs** — integrate new Schedule and Insights tabs (9 tabs total), add tab abbreviations
7. **SettingsSheet** — add theme swatch selector
8. **ChatPage** — add proactive insight injection logic; add Schedule/Insights to command palette
9. **Melina engine** — add `detectScheduleIntent`, `detectInsightIntent`, and corresponding response functions
10. **Mobile nav** — add Schedule tab to bottom nav
