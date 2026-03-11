# Melina - Continuous Conversation Engine

## Current State
- `melina-engine.ts` generates responses with a context window of only the last 5 user messages
- Responses do not consistently end with a follow-up question or open invitation
- Farewell responses fully close the conversation
- ChatPage.tsx has a textarea input that should already be persistent; infinite messages already implemented via windowed rendering

## Requested Changes (Diff)

### Add
- Every Melina response must end with a contextual follow-up question or open invitation (not generic sign-off)
- Deep context window: reference up to 20 prior user messages when generating responses
- `buildSessionMemoryCallback` should scan up to 20 messages back for callbacks, not just the last few

### Modify
- `extractContext` in `melina-engine.ts`: increase `lastUserMessages` slice from -5 to -20
- `buildFarewellResponse`: respect user intent to end (graceful goodbye), but leave door open subtly without forcing continuation
- `buildContextualResponse` and all response builders: append a follow-up question or open invitation at the end of every response
- Ensure chat textarea input in ChatPage is always rendered and never conditionally hidden based on message count

### Remove
- Nothing removed

## Implementation Plan
1. In `melina-engine.ts`, update `extractContext` to use `.slice(-20)` for `lastUserMessages`
2. Add a `appendFollowUp(response, topic, name)` helper that appends a contextual follow-up to any response string
3. Apply `appendFollowUp` at the end of `generateMelinaResponse` before returning (excluding farewell intent)
4. Update farewell responses to be warm and leave door open ("I'll be here whenever you're ready")
5. In `ChatPage.tsx`, confirm textarea input is unconditionally rendered with no message-count gate
