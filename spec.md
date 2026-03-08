# ARIA Assistant — Phase 3A

## Current State

The app has:
- Authentication (Internet Identity)
- Chat interface with text and voice note recording
- Melina avatar with animated expression ring (idle/thinking/responding/alert states)
- Left sidebar with tabbed panels: Profile, Reminders, Integrations, Memory
- Notification Advisor collapsible panel above the chat input
- Settings Sheet for tone, display name, notifications, memory tracking
- Backend: adaptive responses based on tone prefix + pending reminder count; full CRUD for reminders, memory, notifications, settings, integrations, user profiles

## Requested Changes (Diff)

### Add

1. **Intent Detection in Backend** — The `chat` function should parse user messages for natural language intents:
   - Create reminder: "remind me to X at Y time" → call createReminder inline, confirm in response
   - Update memory: "my name is X", "I prefer X", "remember that X" → call updateMemoryEntry inline, confirm in response
   - Query reminders: "what are my reminders", "do I have anything due" → list upcoming reminders in response
   - Query memory: "what do you know about me", "what have you remembered" → list stored memory in response
   - Dismiss notifications: "dismiss all notifications", "clear alerts" → dismiss all inline, confirm in response
   - Greetings and fallback: friendly adaptive response based on tone and user name from memory

2. **Smarter Contextual Responses** — Responses should use the user's stored name (from memory key "name" or profile username), reference past interactions, and vary phrasing based on tone. Remove the "You said: X" echo pattern. Responses should feel natural and complete.

3. **Activity Dashboard Tab** — Add a new "Dashboard" tab to the SidebarTabs component showing:
   - Total messages sent (user + assistant count)
   - Reminders created vs completed (counts)
   - Memory entries count
   - Notifications active (undismissed)
   - A motivational/status message from Melina based on activity level

4. **Browser Text-to-Speech (TTS)** — When Melina sends a response, a small speaker icon appears next to the message bubble. Clicking it reads the message aloud using the Web Speech API (window.speechSynthesis). A stop button cancels reading. No external API needed.

5. **Voice Note Transcription Simulation** — When a voice note is recorded and stopped, instead of just showing "[Voice Note]", show a placeholder transcription "[Voice note received — tap to send as text]" with a button to send it to Melina as a chat message. This improves UX while real STT is not yet integrated.

### Modify

- `SidebarTabs.tsx` — Add a "Dashboard" tab (4th tab) with activity stats
- `ChatPage.tsx` — Add TTS speaker button per Melina message; improve voice note display
- Backend `generateAdaptiveResponse` → replace with full intent parsing logic
- Backend `chat` function → wire intent detection to perform side effects (createReminder, updateMemoryEntry, dismissNotification) and return meaningful confirmations

### Remove

- The "You said: X" echo suffix from all adaptive responses

## Implementation Plan

1. **Backend (`main.mo`)**: Replace `generateAdaptiveResponse` with intent-parsing logic using `Text.contains` pattern matching. Add helper functions for: intent detection, reminder creation from chat, memory update from chat, reminder/memory query formatting. Wire side effects into `chat` function.

2. **Frontend — Dashboard Tab**: Add `DashboardPanel.tsx` component that receives message count, reminder stats, memory count, notification count and renders activity cards + Melina status message. Add as 4th tab in `SidebarTabs.tsx`.

3. **Frontend — TTS**: Add `useSpeech.ts` hook wrapping `window.speechSynthesis`. Add speaker icon button to each assistant message bubble in `ChatPage.tsx`. Show stop button when speaking.

4. **Frontend — Voice Note UX**: Update `mr.onstop` handler in `ChatPage.tsx` to show an actionable voice note message with a "Send as text" button that triggers `handleSend` with a placeholder or transcribed text.

5. **Validation**: typecheck + lint + build.
