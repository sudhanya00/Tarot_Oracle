# OpenAI.ts - Remove Mock Mode Instructions

## Current Issue
The `openai.ts` file still references mock mode via `isMock()` and has a `mockReading()` function. Since you're no longer using mock mode, this needs to be cleaned up.

## Changes Required

### 1. Update the import (Line 2)
**Change:**
```typescript
import { extra, isMock } from './env';
```

**To:**
```typescript
import { extra } from './env';
```

### 2. Remove the mockReading function (Lines 25-32)
**Delete these lines completely:**
```typescript
function mockReading(topic?: string) {
  const lines = [
    'Card – The Sun ☀️',
    '',
    `Warm clarity and joyful momentum surround you${topic ? ` in matters of ${topic}` : ''}.`,
    'Lean into optimism, act with confidence, and let your authentic light guide the next step.',
  ];
  return lines.join('\n');
}
```

### 3. Update tarotReply function (Lines 34-48)
**Replace lines 36-48 (the mock mode check):**
```typescript
export async function tarotReply(userMessages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const key = extra.OPENAI_API_KEY;
  const modeMock = isMock() || !key;

  console.log('tarotReply: isMock =', isMock(), 'hasKey =', !!key, 'modeMock =', modeMock);

  if (modeMock) {
    console.log('tarotReply: Using MOCK mode');
    const lastUser = userMessages.slice().reverse().find(m => m.role === 'user')?.content || '';
    const topic = lastUser?.slice(0, 40);
    return mockReading(topic);
  }

  console.log('tarotReply: Calling OpenAI API...');
```

**With:**
```typescript
export async function tarotReply(userMessages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const key = extra.OPENAI_API_KEY;

  if (!key) {
    console.error('tarotReply: OPENAI_API_KEY not configured!');
    throw new Error('OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables.');
  }

  console.log('tarotReply: Calling OpenAI API...');
```

## Summary

The file currently has fallback logic for mock mode. Since you're running in production mode now:

1. **Remove** the `isMock` import
2. **Remove** the `mockReading()` function entirely
3. **Replace** the mock check with a proper error if API key is missing
4. Always use the real OpenAI API (no fallback to mock readings)

This ensures that:
- The app always requires a valid `OPENAI_API_KEY`
- No mock readings are served
- Errors are properly thrown if the API key is missing
- The code is cleaner and production-ready

## Note on SYSTEM Prompt
While making these changes, you can also optionally update the SYSTEM prompt using the content from `NEW_SYSTEM_PROMPT.txt` for better tarot readings with enhanced personality guidelines.
