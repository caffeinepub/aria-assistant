# ARIA Assistant — Phase 1

## Current State
New project. No existing frontend or backend code.

## Requested Changes (Diff)

### Add
- User registration and login (username, email, password)
- Melina AI assistant chat interface (text input + voice note button)
- Adaptive memory system: stores user name, tone preferences, and conversation history per user
- Melina avatar display (generated portrait illustration)
- Futuristic HUD-style UI layout
- Melina sends contextual, personalized responses based on stored memory
- Simple expression state system: Melina's status text/icon changes based on conversation mood (greeting, thinking, responding, idle)

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan

### Backend (Motoko)
1. User registration: store username, email, hashed password
2. User login: authenticate and return session principal
3. Memory store: per-user key-value store for name, tone, preferences, chat history (last 50 messages)
4. Chat endpoint: receive user message, return adaptive response based on stored memory
5. Memory management: read, update, delete memory entries

### Frontend (React + TypeScript)
1. Auth screens: Register page and Login page
2. Main chat screen:
   - Left panel: Melina avatar portrait with animated status indicator and expression state label
   - Right panel: Chat message history with timestamps
   - Bottom: text input + send button + microphone (voice note) button
3. Memory panel: collapsible sidebar showing stored preferences (editable)
4. HUD aesthetic: dark background, glowing teal/cyan accent lines, holographic card borders, futuristic typography
5. Adaptive greeting: Melina greets user by name on login
6. Voice note: microphone button records audio, displays as voice note bubble (playback only in Phase 1 — no transcription)
