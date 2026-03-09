# ARIA Assistant

## Current State
The app has a full-stack AI assistant (Melina) with:
- Chat with infinite history (Phase 6A)
- Habit analytics heatmap (Phase 6B)
- Wake-word simulation (Phase 6C)
- Task Automation panel (Phase 6D-1): create/toggle/delete/manual-run automation rules stored in localStorage
- Sidebar tabs: Dash, Stats, Insght, Prof, Rmnd, Sched, Habits, H.Stats, Mem, Intgr, Auto
- Backend: reminders, schedule events, notifications, memory, settings (all live via useQueries)
- Habits: stored in localStorage (aria_habits / aria_habit_logs)
- Automations: stored in localStorage (melina_automations)

## Requested Changes (Diff)

### Add
- **Automation execution engine**: when "Run Now" is triggered, each automation rule inspects live app state and performs a real action:
  - `send_message` → injects a chat message as Melina's response into a shared callback
  - `log_habit` → finds the first matching habit by name and triggers a check-in (localStorage)
  - `create_reminder` → calls backend createReminder with a 24h-from-now due time
  - `show_insight` → dispatches an event that highlights the Insights tab
  - `play_tts` → speaks the action detail text via Web Speech API
- **Automation run log**: a persistent log of all automation executions stored in localStorage (`melina_automation_log`)
  - Each entry: automationId, automationName, trigger, action, status (success/failed/skipped), timestamp, resultMessage
  - Max 100 entries, oldest pruned first
- **AutomationLog.tsx**: new isolated component rendering the run log as a scrollable list
  - Per-entry: color-coded status badge, automation name, action taken, timestamp, result note
  - Clear log button
- **"Log" tab inside the Automate panel** (second sub-tab inside TaskAutomation.tsx): switches between "Rules" view (existing) and "Log" view (AutomationLog)
- Session-start automations fire automatically on app mount (once per session, tracked in sessionStorage)

### Modify
- `TaskAutomation.tsx`: add sub-tab bar (Rules / Log), wire Run Now to the real execution engine, fire session_start automations on mount, export `runAutomation` helper
- `SidebarTabs.tsx`: pass a `onMelinaMessage` callback down to TaskAutomation so `send_message` automations can inject chat messages
- `ChatPage.tsx`: expose an `onExternalMessage` prop or use a shared event bus (CustomEvent on window) so automation messages appear in chat

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/utils/automationEngine.ts` — pure execution logic, reads habits/logs from localStorage, accepts callbacks for chat injection and TTS
2. Create `src/frontend/src/components/AutomationLog.tsx` — run log viewer component
3. Update `TaskAutomation.tsx` — add Rules/Log sub-tabs, wire Run Now to engine, session_start auto-fire on mount
4. Update `ChatPage.tsx` — listen for `melina:external-message` window CustomEvent and inject as Melina message
5. Validate and deploy
