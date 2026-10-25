// src/lib/openai.ts
import { fetch as expoFetch } from 'expo/fetch';
import { extra, isMock } from './env';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

// GPT-5.6 Luna via the Responses API: low reasoning effort keeps replies fast,
// streaming lets the UI reveal the reading as it arrives.
export const ORACLE_MODEL = 'gpt-5.6-luna';
const REASONING_EFFORT = 'low';
// Reasoning tokens count against this budget, so leave headroom above the visible reply.
const MAX_OUTPUT_TOKENS = 1600;
const FIRST_BYTE_TIMEOUT_MS = 30000;

const FALLBACK_ERROR = 'Something went wrong getting your reading. Please try again.';
const FALLBACK_BUSY = FALLBACK_ERROR;

// === Tarot Oracle Persona ===
// The prompt that shipped in production (fix-openai, Android build 19), with three changes:
// no dashes, a plain "Card: <Name>" first line, and no "Tuning Into the Energy" stall reply.
const SYSTEM = `You are Tarot Oracle, a mystical and intuitive tarot card reader. You speak with calm confidence, guiding the user through life’s questions using symbolism, intuition, and ancient tarot wisdom.
You explain each card's meaning in a grounded, spiritual, emotionally resonant way. You make absolute predictions with self-reflection.

Conversation Rule (VERY IMPORTANT):
- Greet ONLY once per conversation: only in your first reply of the chat OR when the user greets you first (e.g., "hi", "hello").
- If you have already greeted earlier in this chat, DO NOT greet again.

Reading Rules:
- If the user’s question is clear enough, draw cards and answer directly (do NOT ask clarifying questions).
- No hedge talks, No refinement, be transparent, and honest
- Use Emoji along with the text
- Ask a clarifying question ONLY if the user’s request is genuinely ambiguous, and ask only ONE short question.
- Use real Tarot structure: Major Arcana, Minor Arcana (Cups, Wands, Swords, Pentacles).
- Describe symbolism, upright and reversed meanings, and how it applies to the user’s situation.
- Interpret with empathy, not fear.
- Use 1-card, 3-card (past-present-future), Celtic Cross, or custom spreads based on user preference.
- Close with a mystical affirmation like: “Trust the signs. The answers are already within you.”

Timing Guidance Rule:
- You MAY offer symbolic or energetic timeframes using tarot tradition (suits, numbers, Major Arcana symbolism).
- Give approximate calendar dates.
- Phrase timing as "likely within", "around", or "over the coming period".
- If timing is unclear, state that the energy is still forming.

Writing Style:
- Never use em dashes (—) or en dashes (–). Use commas, periods, or colons instead.

Output Format (STRICT):
- Do NOT include any greeting unless allowed by Conversation Rule.
- When you draw a card, your answer MUST be exactly:

Card: <Name>

<meaning/advice>`;

type StreamOptions = {
  // Called with each new chunk of text and the full text so far.
  onDelta?: (delta: string, fullText: string) => void;
  signal?: AbortSignal;
};

function mockReading(topic?: string) {
  const lines = [
    'Card: The Sun',
    '',
    `Warm clarity and joyful momentum surround you${topic ? ` in matters of ${topic}` : ''}.`,
    'Lean into optimism, act with confidence, and let your authentic light guide the next step.',
    '',
    'Trust the signs. The answers are already within you.',
  ];
  return lines.join('\n');
}

// Streams the mock reading word by word so the UI behaves like the real thing.
async function streamMock(text: string, { onDelta, signal }: StreamOptions): Promise<string> {
  let full = '';
  const tokens = text.match(/\S+\s*|\n/g) || [text];
  for (const token of tokens) {
    if (signal?.aborted) break;
    await new Promise((resolve) => setTimeout(resolve, 35));
    full += token;
    onDelta?.(token, full);
  }
  return full;
}

// Parses one SSE event block from the Responses API and returns any text delta.
function parseEvent(block: string): { delta?: string; done?: boolean; error?: string } {
  const data = block
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('');
  if (!data || data === '[DONE]') return {};

  let event: any;
  try {
    event = JSON.parse(data);
  } catch {
    return {};
  }

  switch (event?.type) {
    case 'response.output_text.delta':
      return { delta: event.delta ?? '' };
    case 'response.completed':
    case 'response.incomplete':
      return { done: true };
    case 'response.failed':
      return { error: event.response?.error?.message || 'response.failed' };
    case 'error':
      return { error: event.message || event.error?.message || 'stream error' };
    default:
      return {};
  }
}

// Core reply (mock or real), streamed. Resolves with the complete reply text.
export async function streamTarotReply(
  userMessages: ChatMessage[],
  options: StreamOptions = {}
): Promise<string> {
  const key = extra.OPENAI_API_KEY;
  const modeMock = isMock() || !key;

  if (modeMock) {
    console.log('streamTarotReply: Using MOCK mode');
    const lastUser = userMessages.slice().reverse().find((m) => m.role === 'user')?.content || '';
    return streamMock(mockReading(lastUser.slice(0, 40)), options);
  }

  const body = {
    model: ORACLE_MODEL,
    instructions: SYSTEM,
    input: userMessages.map((m) => ({ role: m.role, content: m.content })),
    reasoning: { effort: REASONING_EFFORT },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    stream: true,
    store: false,
  };

  const controller = new AbortController();
  options.signal?.addEventListener('abort', () => controller.abort());
  const timeoutId = setTimeout(() => {
    console.warn('streamTarotReply: No response after 30 seconds, aborting...');
    controller.abort();
  }, FIRST_BYTE_TIMEOUT_MS);

  let full = '';
  try {
    const res = await expoFetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok || !res.body) {
      console.warn('streamTarotReply: OpenAI error response:', res.status, await res.text());
      return FALLBACK_BUSY;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const event = parseEvent(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');

        if (event.error) {
          console.warn('streamTarotReply: stream error:', event.error);
          return full.trim() || FALLBACK_BUSY;
        }
        if (event.delta) {
          full += event.delta;
          options.onDelta?.(event.delta, full);
        }
      }
    }

    return full.trim() || FALLBACK_BUSY;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('streamTarotReply: Error calling OpenAI:', error);
    return full.trim() || FALLBACK_ERROR;
  }
}

// Non-streaming convenience wrapper.
export async function tarotReply(userMessages: ChatMessage[]): Promise<string> {
  return streamTarotReply(userMessages);
}
