# Melina — Phase 7C

## Current State
Melina uses `melina-engine.ts` (Phase 7B) for all response generation. The engine has solid intent detection, contextual awareness, and tone adaptation. Responses are functional and contextual but lack:
- Topic-level semantic awareness (tech, lifestyle, philosophy, emotions, etc.)
- Session memory callbacks (e.g., referencing something said earlier in the same chat)
- Natural filler phrases that feel organic and personality-driven
- Sentence structure variety within the same intent bucket

## Requested Changes (Diff)

### Add
- `detectTopic()` function: classifies message into semantic topic clusters (tech, lifestyle, philosophy, work, creative, emotional, random)
- `buildFillerPrefix()` function: returns personality-driven filler starters ("Honestly...", "Look...", "Okay, real talk —", "As if I didn't see that coming —")
- `buildSessionMemoryReference()` function: scans session chat history for a prior user message and naturally weaves a callback into the response
- Expanded response pools per intent with longer, more varied sentence structures
- Topic-aware response branching inside `buildContextualResponse()` and `buildFactualResponse()`

### Modify
- `buildContextualResponse()`: inject topic-aware branches + session callbacks + filler prefixes
- `buildGreetingResponse()`: reference what user talked about last time in same session
- `buildPersonalQuestionResponse()`: add memory of session topic context
- `buildFactualResponse()`: expand knowledge base and add topic-aware follow-up prompts
- `generateMelinaResponse()`: pass topic detection result into relevant builders

### Remove
- Nothing removed

## Implementation Plan
1. Add `detectTopic()` semantic classifier
2. Add `buildFillerPrefix()` with Melina personality tone
3. Add `buildSessionMemoryReference()` for mid-session callbacks
4. Expand response pools (at least 2-3 new variants per major intent)
5. Wire topic + filler + session memory into contextual and general responses
6. Validate frontend build
